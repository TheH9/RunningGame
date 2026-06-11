-- Bornes — migration 0007 : push notifications (Expo) pilotées par la base.
-- Idempotente.
--
-- Architecture : un trigger Postgres détecte un événement (duel lancé/terminé,
-- drop ouvert, territoire repris) et appelle `send_push()`, qui POST (pg_net,
-- async) vers l'edge function `notify`. Celle-ci résout les tokens des
-- destinataires (device_tokens) et envoie via l'API Expo Push.
--
-- Config (URL de la fonction + secret partagé) : table privée app_config,
-- renseignée hors-migration (valeurs jamais commitées). Sans config, no-op.

begin;

create extension if not exists pg_net;

-- ----------------------------------------------------------------------------
-- Tokens de push par appareil (un user peut avoir plusieurs appareils).
-- ----------------------------------------------------------------------------
create table if not exists device_tokens (
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table device_tokens enable row level security;

drop policy if exists dt_select_self on device_tokens;
create policy dt_select_self on device_tokens for select using (auth.uid() = user_id);
drop policy if exists dt_insert_self on device_tokens;
create policy dt_insert_self on device_tokens for insert with check (auth.uid() = user_id);
drop policy if exists dt_update_self on device_tokens;
create policy dt_update_self on device_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists dt_delete_self on device_tokens;
create policy dt_delete_self on device_tokens for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Config privée (URL fonction + secret). Aucune policy → invisible au client ;
-- seules les fonctions SECURITY DEFINER (qui contournent la RLS) la lisent.
-- ----------------------------------------------------------------------------
create table if not exists app_config (
  key   text primary key,
  value text not null
);
alter table app_config enable row level security;

-- ----------------------------------------------------------------------------
-- Envoi : POST async vers l'edge function notify (no-op si non configuré).
-- ----------------------------------------------------------------------------
create or replace function send_push(p_user_ids uuid[], p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url    text;
  v_secret text;
  v_ids    uuid[];
begin
  -- déduplique et retire les nulls
  select array_agg(distinct u) into v_ids from unnest(p_user_ids) u where u is not null;
  if v_ids is null or array_length(v_ids, 1) is null then return; end if;

  select value into v_url    from app_config where key = 'notify_url';
  select value into v_secret from app_config where key = 'notify_secret';
  if v_url is null then return; end if;  -- pas encore configuré

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', coalesce(v_secret, '')),
    body    := jsonb_build_object('user_ids', to_jsonb(v_ids), 'title', p_title, 'body', p_body, 'data', coalesce(p_data, '{}'::jsonb))
  );
end;
$$;
revoke execute on function send_push(uuid[], text, text, jsonb) from anon, authenticated, public;

-- ----------------------------------------------------------------------------
-- Triggers d'événements
-- ----------------------------------------------------------------------------

-- Duel lancé → notifie le défié.
create or replace function trg_duel_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_from text;
begin
  select pseudo into v_from from profiles where id = new.a_user_id;
  perform send_push(
    array[new.b_user_id],
    '⚔️ Nouveau duel',
    coalesce(v_from, 'Un coureur') || ' te défie — 7 jours pour peindre plus !',
    jsonb_build_object('type', 'duel', 'duelId', new.id)
  );
  return new;
end;
$$;
drop trigger if exists on_duel_insert on duels;
create trigger on_duel_insert after insert on duels
  for each row execute function trg_duel_insert();

-- Duel réglé (active → a_won/b_won/draw) → notifie les deux.
create or replace function trg_duel_settle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'active' and new.status in ('a_won', 'b_won', 'draw') then
    perform send_push(
      array[new.a_user_id, new.b_user_id],
      '🏁 Duel terminé',
      'Le duel est fini — viens voir le résultat !',
      jsonb_build_object('type', 'duel-result', 'duelId', new.id)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists on_duel_settle on duels;
create trigger on_duel_settle after update on duels
  for each row execute function trg_duel_settle();

-- Drop ouvert → notifie tous les coureurs de la ville.
create or replace function trg_drop_open() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'open' and (TG_OP = 'INSERT' or old.status is distinct from 'open') then
    perform send_push(
      array(select id from profiles where city_id = new.city_id),
      '🎁 Drop actif',
      'Un lot t''attend dans ta ville — passe dans le cercle doré en courant !',
      jsonb_build_object('type', 'drop', 'dropId', new.id)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists on_drop_open on drops;
create trigger on_drop_open after insert or update on drops
  for each row execute function trg_drop_open();

-- ----------------------------------------------------------------------------
-- Territoire repris : on greffe un push dans score_run (cible = derniers
-- coureurs des équipes précédemment dominantes sur les cellules touchées).
-- Corps identique à 0006 + le send_push avant le drop de _before.
-- ----------------------------------------------------------------------------
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

  -- Push aux anciens propriétaires des cellules touchées (best-effort).
  perform send_push(
    array(
      select distinct tc.last_runner_id
      from territory_cells tc
      join _before bef on bef.h3 = tc.h3_index and bef.team_id = tc.team_id
      where tc.last_runner_id is not null
        and tc.last_runner_id <> v_run.user_id
        and bef.team_id <> v_run.team_id
      limit 200
    ),
    '🔥 Zone reprise',
    v_pseudo || ' vient de te reprendre du terrain !',
    jsonb_build_object('type', 'steal')
  );

  drop table if exists _touched;
  drop table if exists _before;

  perform qualify_drops(p_run_id);
end;
$$;
revoke execute on function score_run(uuid) from anon, authenticated, public;

commit;
