-- Bornes — schéma initial (MVP)
-- Modèle validé par ADR-002 (Trail Paint) et ADR-003 (affichage territoire).
-- Extensions : PostGIS (géo), pgcrypto (uuid).
-- NB : le scoring en cellules H3 est calculé CÔTÉ CLIENT (h3-js) et l'index est
-- stocké en texte. L'extension Postgres `h3` n'est pas disponible sur l'image
-- Supabase actuelle (PG17 / PostGIS 3.3.7), d'où ce choix (cf. ADR-002 §4).

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Référentiel
-- ----------------------------------------------------------------------------

create table cities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  bbox        geometry(Polygon, 4326) not null,
  created_at  timestamptz not null default now()
);

create table teams (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references cities(id),
  slug        text not null,            -- vagues | braises | soleils | pousses
  name        text not null,
  color       text not null,            -- hex, source: design tokens
  emoji       text not null,
  unique (city_id, slug)
);

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text not null,
  team_id     uuid references teams(id),         -- définitif pour la saison
  city_id     uuid references cities(id),
  -- Privacy Zone (ADR-002 §5) : centre + rayon, jamais exposée publiquement
  privacy_center geometry(Point, 4326),
  privacy_radius_m integer not null default 200,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Runs & trace peinte
-- ----------------------------------------------------------------------------

create type run_status as enum ('active', 'finished', 'invalidated');

create table runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id),
  team_id     uuid not null references teams(id),
  status      run_status not null default 'active',
  started_at  timestamptz not null default now(),  -- horodatage SERVEUR (anti-triche)
  ended_at    timestamptz,
  distance_m  double precision not null default 0,
  painted_m   double precision not null default 0, -- mètres hors Privacy Zone
  invalid_reason text
);

-- Trace simplifiée côté client (Douglas-Peucker ~5 m), uploadée par batch.
create table run_points (
  id          bigint generated always as identity primary key,
  run_id      uuid not null references runs(id) on delete cascade,
  geom        geometry(Point, 4326) not null,
  recorded_at timestamptz not null,
  accuracy_m  double precision,
  -- cellule H3 (rés. 11 ≈ 25 m) calculée par le client (h3-js), source du scoring
  h3_index    text,
  -- true si dans la Privacy Zone : compté en stats, jamais affiché/peint
  is_private  boolean not null default false
);
create index run_points_run_idx on run_points (run_id, recorded_at);
create index run_points_geom_idx on run_points using gist (geom);

-- ----------------------------------------------------------------------------
-- Territoire (scoring en cellules H3 — rés. 11 ≈ 25 m)
-- ----------------------------------------------------------------------------

create table territory_cells (
  h3_index    text not null,
  city_id     uuid not null references cities(id),
  team_id     uuid not null references teams(id),
  score       double precision not null default 0,
  last_seen   timestamptz not null default now(),
  primary key (h3_index, team_id)
);
create index territory_cells_city_idx on territory_cells (city_id);

-- Vue : équipe dominante par cellule (l'affichage hex au dézoom, ADR-003)
create view territory_owner as
select distinct on (h3_index)
  h3_index, city_id, team_id, score, last_seen,
  -- décroissance : pâlit > 14 j, neutre > 30 j (job decay_territory)
  (now() - last_seen) > interval '14 days' as fading
from territory_cells
order by h3_index, score desc, last_seen desc;

create view team_scores as
select city_id, team_id, count(*)::int as cells, sum(score) as total_score
from territory_owner
group by city_id, team_id;

-- ----------------------------------------------------------------------------
-- Méta-jeu : défi sponsorisé, drops, lots
-- ----------------------------------------------------------------------------

create table partners (
  id        uuid primary key default gen_random_uuid(),
  city_id   uuid not null references cities(id),
  name      text not null,
  shop_geom geometry(Point, 4326),
  contact   text
);

create table challenges (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references cities(id),
  partner_id  uuid references partners(id),
  title       text not null,
  month       date not null,            -- 1er du mois
  prize       text not null,
  status      text not null default 'draft'  -- draft | live | drawn | closed
);

create table drops (
  id           uuid primary key default gen_random_uuid(),
  city_id      uuid not null references cities(id),
  partner_id   uuid references partners(id),
  point_geom   geometry(Point, 4326) not null,
  radius_m     integer not null default 150,
  window_start timestamptz not null,
  window_end   timestamptz not null,
  prize        text not null,
  status       text not null default 'scheduled' -- scheduled | open | drawn
);

create table drop_qualifiers (
  drop_id   uuid not null references drops(id) on delete cascade,
  user_id   uuid not null references profiles(id),
  run_id    uuid not null references runs(id),
  qualified_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);

create table prizes_won (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id),
  source_type text not null,            -- challenge | drop
  source_id   uuid not null,
  qr_code     text not null unique default encode(gen_random_bytes(16), 'hex'),
  status      text not null default 'pending', -- pending | redeemed | expired
  expires_at  timestamptz not null,
  redeemed_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Scoring d'un run (worker async — appelé par l'edge function score-run)
-- ----------------------------------------------------------------------------

create or replace function score_run(p_run_id uuid)
returns void language plpgsql security definer as $$
declare
  v_run runs%rowtype;
  v_city uuid;
begin
  select * into v_run from runs where id = p_run_id and status = 'finished';
  if not found then return; end if;
  select city_id into v_city from teams where id = v_run.team_id;

  -- Agrégation de la trace publique en cellules H3 rés. 11 (~25 m), ADR-002 §4
  insert into territory_cells (h3_index, city_id, team_id, score, last_seen)
  select h3_index,
         v_city, v_run.team_id, count(*)::double precision, max(recorded_at)
  from run_points
  where run_id = p_run_id and is_private = false and h3_index is not null
  group by h3_index
  on conflict (h3_index, team_id) do update
    set score = territory_cells.score + excluded.score,
        last_seen = greatest(territory_cells.last_seen, excluded.last_seen);
end;
$$;

-- Anti-triche v1 : invalide un run si vitesse moyenne > 40 km/h (ADR-002)
create or replace function validate_run(p_run_id uuid)
returns boolean language plpgsql security definer as $$
declare
  v_kmh double precision;
begin
  select (distance_m / 1000.0) / greatest(extract(epoch from (ended_at - started_at)) / 3600.0, 0.001)
    into v_kmh from runs where id = p_run_id;
  if v_kmh > 40 then
    update runs set status = 'invalidated', invalid_reason = 'speed' where id = p_run_id;
    return false;
  end if;
  return true;
end;
$$;

-- Décroissance quotidienne (à brancher sur pg_cron) : > 30 j → cellule libérée
create or replace function decay_territory()
returns void language sql security definer as $$
  delete from territory_cells where now() - last_seen > interval '30 days';
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table profiles enable row level security;
alter table runs enable row level security;
alter table run_points enable row level security;
alter table territory_cells enable row level security;
alter table prizes_won enable row level security;
alter table drop_qualifiers enable row level security;

create policy "profiles: lecture publique (pseudo/équipe)" on profiles for select using (true);
create policy "profiles: maj par soi-même" on profiles for update using (auth.uid() = id);
create policy "profiles: insert par soi-même" on profiles for insert with check (auth.uid() = id);

create policy "runs: lecture publique" on runs for select using (true);
create policy "runs: insert par soi-même" on runs for insert with check (auth.uid() = user_id);
create policy "runs: maj par soi-même" on runs for update using (auth.uid() = user_id);

-- les points privés ne sortent JAMAIS en lecture publique
create policy "run_points: lecture publique hors privacy" on run_points
  for select using (is_private = false);
create policy "run_points: insert sur ses runs" on run_points
  for insert with check (exists (select 1 from runs r where r.id = run_id and r.user_id = auth.uid()));

create policy "territory: lecture publique" on territory_cells for select using (true);
create policy "prizes: lecture par le gagnant" on prizes_won for select using (auth.uid() = user_id);
create policy "qualifiers: lecture par soi" on drop_qualifiers for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Seed : Asnières-sur-Seine + les 4 équipes (zone de lancement)
-- ----------------------------------------------------------------------------

insert into cities (name, slug, bbox) values (
  'Asnières-sur-Seine', 'asnieres',
  st_geomfromtext('POLYGON((2.2667 48.8980, 2.3060 48.8980, 2.3060 48.9260, 2.2667 48.9260, 2.2667 48.8980))', 4326)
);

insert into teams (city_id, slug, name, color, emoji)
select id, t.slug, t.name, t.color, t.emoji
from cities, (values
  ('vagues',  'Les Vagues',  '#3B82F6', '🌊'),
  ('braises', 'Les Braises', '#FF4D5E', '🔥'),
  ('soleils', 'Les Soleils', '#F5B82E', '☀️'),
  ('pousses', 'Les Pousses', '#2EB789', '🌱')
) as t(slug, name, color, emoji)
where cities.slug = 'asnieres';
