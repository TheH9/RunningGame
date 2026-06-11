-- Bornes — migration 0004 : helpers de lecture pour le client de prod.
-- Idempotente.

begin;

-- Traces récentes d'une ville reconstruites depuis run_points (≤ 14 j),
-- au format attendu par PaintedTrail côté client : points = [[lon,lat], …].
-- Lecture publique (run_points.is_private = false via RLS / filtre explicite).
create or replace function recent_trails(p_city uuid, p_limit integer default 120)
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(t order by t.painted_at desc), '[]'::jsonb)
  from (
    select
      r.id::text                                   as id,
      tm.slug                                      as team,
      p.pseudo                                     as "runnerPseudo",
      (extract(epoch from r.ended_at) * 1000)::bigint as "paintedAt",
      (
        select jsonb_agg(jsonb_build_array(st_x(rp.geom), st_y(rp.geom)) order by rp.recorded_at)
        from run_points rp
        where rp.run_id = r.id and rp.is_private = false
      ) as points
    from runs r
    join teams tm on tm.id = r.team_id
    join profiles p on p.id = r.user_id
    where tm.city_id = p_city
      and r.status = 'finished'
      and r.ended_at is not null
      and r.ended_at > now() - interval '14 days'
    order by r.ended_at desc
    limit p_limit
  ) t
  where t.points is not null;
$$;

grant execute on function recent_trails(uuid, integer) to anon, authenticated;

-- Date d'obtention d'un lot (pour RewardItem.wonAt).
alter table prizes_won add column if not exists created_at timestamptz not null default now();

-- Vue drops : expose lon/lat (évite de parser du WKB côté client).
create or replace view drops_public
  with (security_invoker = true) as
select
  d.id, d.city_id, d.partner_id,
  st_x(d.point_geom) as lon,
  st_y(d.point_geom) as lat,
  d.radius_m, d.window_start, d.window_end, d.prize, d.status,
  coalesce(pa.name, '') as partner_name
from drops d
left join partners pa on pa.id = d.partner_id;

-- Vue défis : titre + partenaire prêts à afficher.
create or replace view challenges_public
  with (security_invoker = true) as
select
  c.id, c.city_id, c.title, c.month, c.prize, c.status,
  coalesce(pa.name, '') as partner_name
from challenges c
left join partners pa on pa.id = c.partner_id;

commit;
