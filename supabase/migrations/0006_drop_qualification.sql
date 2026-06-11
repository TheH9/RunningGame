-- Bornes — migration 0006 : qualification automatique aux drops (côté serveur).
-- Idempotente.
--
-- Jusqu'ici, drop_qualifiers n'était jamais alimenté → claim_drop levait
-- toujours « non qualifié ». On branche la qualification dans le scoring :
-- à la fin d'un run, si la trace publique passe dans le cercle d'un drop ouvert
-- pendant sa fenêtre, le coureur est qualifié. PostGIS (ST_DWithin en geography)
-- fait le test de distance en mètres. Server-side / SECURITY DEFINER : aucune
-- confiance dans le client.

begin;

create or replace function qualify_drops(p_run_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_run runs%rowtype;
begin
  select * into v_run from runs where id = p_run_id;
  if not found then return; end if;

  insert into drop_qualifiers (drop_id, user_id, run_id)
  select d.id, v_run.user_id, v_run.id
  from drops d
  join teams t on t.id = v_run.team_id and t.city_id = d.city_id
  where d.status = 'open'
    -- le run chevauche la fenêtre du drop
    and v_run.started_at <= d.window_end
    and coalesce(v_run.ended_at, now()) >= d.window_start
    -- au moins un point public dans le rayon (distance réelle en mètres)
    and exists (
      select 1 from run_points rp
      where rp.run_id = v_run.id
        and rp.is_private = false
        and st_dwithin(rp.geom::geography, d.point_geom::geography, d.radius_m)
    )
  on conflict (drop_id, user_id) do nothing;
end;
$$;

-- Verrou : appelée uniquement par le serveur (depuis score_run / edge function).
revoke execute on function qualify_drops(uuid) from anon, authenticated, public;

-- On rebranche qualify_drops à la fin de score_run (sinon il faudrait un second
-- appel depuis l'edge function). Corps identique à 0002 + l'appel final.
create or replace function score_run(p_run_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_run    runs%rowtype;
  v_city   uuid;
  v_pseudo text;
begin
  select * into v_run from runs where id = p_run_id and status = 'finished';
  if not found then return; end if;
  select city_id into v_city from teams where id = v_run.team_id;
  select pseudo  into v_pseudo from profiles where id = v_run.user_id;

  drop table if exists _touched;
  create temp table _touched as
    select h3_index                   as h3,
           count(*)::double precision  as inc,
           max(recorded_at)            as ts
    from run_points
    where run_id = p_run_id and is_private = false and h3_index is not null
    group by h3_index;

  if (select count(*) from _touched) = 0 then
    drop table if exists _touched;
    perform qualify_drops(p_run_id);
    return;
  end if;

  drop table if exists _before;
  create temp table _before as
    select distinct on (tc.h3_index) tc.h3_index as h3, tc.team_id
    from territory_cells tc
    join _touched t on t.h3 = tc.h3_index
    order by tc.h3_index, tc.score desc, tc.last_seen desc;

  insert into territory_cells (h3_index, city_id, team_id, score, last_seen, last_runner_id, last_runner_pseudo)
  select t.h3, v_city, v_run.team_id, t.inc, t.ts, v_run.user_id, v_pseudo
  from _touched t
  on conflict (h3_index, team_id) do update
    set score              = territory_cells.score + excluded.score,
        last_seen          = greatest(territory_cells.last_seen, excluded.last_seen),
        last_runner_id     = excluded.last_runner_id,
        last_runner_pseudo = excluded.last_runner_pseudo;

  insert into feed_events (city_id, kind, text, team_id, actor)
  select v_city, 'capture',
         v_pseudo || ' a repris une zone à ' || tprev.name,
         v_run.team_id, v_pseudo
  from (
    select distinct on (tc.h3_index) tc.h3_index as h3, tc.team_id
    from territory_cells tc
    join _touched t on t.h3 = tc.h3_index
    order by tc.h3_index, tc.score desc, tc.last_seen desc
  ) aft
  join _before bef on bef.h3 = aft.h3
  join teams   tprev on tprev.id = bef.team_id
  where aft.team_id = v_run.team_id
    and bef.team_id is not null
    and bef.team_id <> v_run.team_id
  limit 50;

  drop table if exists _touched;
  drop table if exists _before;

  -- Qualification aux drops traversés pendant le run.
  perform qualify_drops(p_run_id);
end;
$$;

revoke execute on function score_run(uuid) from anon, authenticated, public;

commit;
