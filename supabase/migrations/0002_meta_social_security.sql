-- Bornes — migration 0002 : méta-jeu, social, sécurité (RLS) complète.
-- Complète 0001_init.sql. Idempotente (ré-exécutable sans casse).
--
-- Couvre :
--   1. Colonnes manquantes (dernier coureur par cellule, métadonnées de lot)
--   2. Tables méta/social : seasons, season_results, friendships, duels,
--      feed_events, achievements
--   3. Vues de classement (security_invoker → respectent la RLS)
--   4. Fonctions serveur (scoring + capture, claim, duels, rollover de saison)
--   5. Triggers (création de profil, updated_at)
--   6. RLS activée + policies sur TOUTES les tables publiques
--   7. Realtime (publication) + cron (pg_cron, optionnel)
--
-- Principe de sécurité : sans RLS, une table du schéma `public` est
-- entièrement ouverte (lecture ET écriture) à quiconque a la clé anon.
-- 0001 avait laissé cities/teams/challenges/drops/partners sans RLS : on
-- ferme tout ici. Les écritures « système » passent par des fonctions
-- SECURITY DEFINER (qui contournent la RLS de façon contrôlée).

begin;

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ALTERS — colonnes manquantes sur les tables de 0001
-- ============================================================================

-- Dernier coureur ayant peint une cellule pour son équipe (inspection au tap,
-- type CellScore.lastRunner côté client).
alter table territory_cells
  add column if not exists last_runner_id     uuid references profiles(id),
  add column if not exists last_runner_pseudo text;

-- Index H3 calculé côté client (h3-js) — source du scoring, voir score_run.
alter table run_points
  add column if not exists h3_index text;

-- Carte d'identité du coureur (rivaux : rue fétiche + titre de quartier).
alter table profiles
  add column if not exists signature_street text,
  add column if not exists title            text,
  add column if not exists updated_at        timestamptz not null default now();

-- Métadonnées de lot, pour reconstruire un RewardItem sans jointure.
alter table prizes_won
  add column if not exists title   text not null default '',
  add column if not exists partner text not null default '',
  add column if not exists emoji   text not null default '🎁';

-- Index utiles aux agrégats de classement et au feed.
create index if not exists runs_user_status_idx on runs (user_id, status, started_at desc);
create index if not exists runs_team_started_idx on runs (team_id, started_at desc);

-- ============================================================================
-- 2. TABLES — saisons, social, feed, succès
-- ============================================================================

create table if not exists seasons (
  id            uuid primary key default gen_random_uuid(),
  city_id       uuid not null references cities(id) on delete cascade,
  number        integer not null,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  duration_days integer not null default 42,
  status        text not null default 'live',   -- live | closed
  unique (city_id, number)
);
create index if not exists seasons_city_status_idx on seasons (city_id, status);

-- Palmarès figé à la clôture d'une saison (Hall of Fame).
create table if not exists season_results (
  id         uuid primary key default gen_random_uuid(),
  season_id  uuid not null references seasons(id) on delete cascade,
  city_id    uuid not null references cities(id) on delete cascade,
  podium     jsonb not null default '[]',   -- [{team_slug, cells, percent}]
  champion   jsonb,                          -- {pseudo, team_slug, painted_km}
  created_at timestamptz not null default now(),
  unique (season_id)
);

-- Amitiés (symétriques via deux lignes, ou requête bidirectionnelle).
create table if not exists friendships (
  user_id    uuid not null references profiles(id) on delete cascade,
  friend_id  uuid not null references profiles(id) on delete cascade,
  status     text not null default 'accepted',  -- pending | accepted | blocked
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friendships_friend_idx on friendships (friend_id);

-- Duels 7 jours entre deux coureurs.
create table if not exists duels (
  id           uuid primary key default gen_random_uuid(),
  a_user_id    uuid not null references profiles(id) on delete cascade,
  b_user_id    uuid not null references profiles(id) on delete cascade,
  city_id      uuid references cities(id),
  season_id    uuid references seasons(id),
  started_at   timestamptz not null default now(),
  ends_at      timestamptz not null,
  -- snapshots figés au règlement (0 tant que le duel est actif → voir vue duel_live)
  a_painted_m  double precision not null default 0,
  b_painted_m  double precision not null default 0,
  status       text not null default 'active',  -- active | a_won | b_won | draw
  check (a_user_id <> b_user_id)
);
create index if not exists duels_a_idx on duels (a_user_id, status);
create index if not exists duels_b_idx on duels (b_user_id, status);

-- Fil d'actualité de la ville (capture de zone, duels, drops, records…).
create table if not exists feed_events (
  id         uuid primary key default gen_random_uuid(),
  city_id    uuid not null references cities(id) on delete cascade,
  kind       text not null,   -- capture | duel | drop | season | record | steal
  text       text not null,
  team_id    uuid references teams(id),
  actor      text,
  created_at timestamptz not null default now()
);
create index if not exists feed_events_city_idx on feed_events (city_id, created_at desc);

-- Succès débloqués (miroir serveur des badges client, pour l'anti-triche /
-- les lots conditionnés à un badge). Optionnel mais propre.
create table if not exists achievements (
  user_id     uuid not null references profiles(id) on delete cascade,
  badge_id    text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ============================================================================
-- 3. VUES — classements (security_invoker : la RLS des tables s'applique)
-- ============================================================================

-- Agrégat par coureur : km peints semaine / total + nb de runs semaine.
create or replace view runner_scores
  with (security_invoker = true) as
select
  p.id                                   as user_id,
  p.pseudo,
  p.city_id,
  t.id                                   as team_id,
  t.slug                                 as team_slug,
  p.signature_street,
  p.title,
  coalesce(sum(r.painted_m) filter (where r.started_at > now() - interval '7 days'), 0)  as week_painted_m,
  coalesce(sum(r.painted_m), 0)                                                          as total_painted_m,
  count(r.id) filter (where r.started_at > now() - interval '7 days')                    as runs_week
from profiles p
join teams t on t.id = p.team_id
left join runs r on r.user_id = p.id and r.status = 'finished'
group by p.id, p.pseudo, p.city_id, t.id, t.slug, p.signature_street, p.title;

-- Score live d'un duel (km peints par chaque camp DANS la fenêtre du duel).
create or replace view duel_live
  with (security_invoker = true) as
select
  d.id,
  d.a_user_id, d.b_user_id, d.started_at, d.ends_at, d.status,
  coalesce((select sum(r.painted_m) from runs r
            where r.user_id = d.a_user_id and r.status = 'finished'
              and r.started_at between d.started_at and least(d.ends_at, now())), 0) as a_live_m,
  coalesce((select sum(r.painted_m) from runs r
            where r.user_id = d.b_user_id and r.status = 'finished'
              and r.started_at between d.started_at and least(d.ends_at, now())), 0) as b_live_m
from duels d;

-- ============================================================================
-- 4. FONCTIONS SERVEUR
-- ============================================================================

-- Generic updated_at.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Création automatique du profil à l'inscription (auth.users → profiles).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, pseudo, city_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'pseudo', 'Coureur'),
    (select id from cities order by created_at limit 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Scoring d'un run (v2) : agrège la trace en cellules H3, met à jour le
-- dernier coureur, et émet un événement de capture quand une cellule change
-- de propriétaire. Source de vérité serveur (ADR-002 §4).
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

  -- Cellules touchées par la trace publique (hors Privacy Zone). L'index H3
  -- (rés. 11) est calculé côté client (h3-js) et stocké sur run_points.
  drop table if exists _touched;
  create temp table _touched as
    select h3_index                   as h3,
           count(*)::double precision  as inc,
           max(recorded_at)            as ts
    from run_points
    where run_id = p_run_id and is_private = false and h3_index is not null
    group by h3_index;

  if (select count(*) from _touched) = 0 then
    drop table if exists _touched; return;
  end if;

  -- Propriétaire AVANT (équipe dominante par cellule touchée).
  drop table if exists _before;
  create temp table _before as
    select distinct on (tc.h3_index) tc.h3_index as h3, tc.team_id
    from territory_cells tc
    join _touched t on t.h3 = tc.h3_index
    order by tc.h3_index, tc.score desc, tc.last_seen desc;

  -- Upsert des scores + dernier coureur de l'équipe.
  insert into territory_cells (h3_index, city_id, team_id, score, last_seen, last_runner_id, last_runner_pseudo)
  select t.h3, v_city, v_run.team_id, t.inc, t.ts, v_run.user_id, v_pseudo
  from _touched t
  on conflict (h3_index, team_id) do update
    set score              = territory_cells.score + excluded.score,
        last_seen          = greatest(territory_cells.last_seen, excluded.last_seen),
        last_runner_id     = excluded.last_runner_id,
        last_runner_pseudo = excluded.last_runner_pseudo;

  -- Émission d'un event de capture sur chaque bascule de propriétaire.
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
end;
$$;

-- Réclamer un lot d'un drop (qualifié + fenêtre ouverte). Idempotent.
create or replace function claim_drop(p_drop_id uuid)
returns prizes_won language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_drop drops%rowtype;
  v_row  prizes_won%rowtype;
begin
  if v_uid is null then raise exception 'authentification requise'; end if;
  select * into v_drop from drops where id = p_drop_id;
  if not found then raise exception 'drop introuvable'; end if;
  if now() < v_drop.window_start or now() > v_drop.window_end then
    raise exception 'fenêtre du drop fermée';
  end if;
  if not exists (select 1 from drop_qualifiers where drop_id = p_drop_id and user_id = v_uid) then
    raise exception 'non qualifié pour ce drop';
  end if;

  select * into v_row from prizes_won
   where source_type = 'drop' and source_id = p_drop_id and user_id = v_uid;
  if found then return v_row; end if;  -- déjà réclamé

  insert into prizes_won (user_id, source_type, source_id, title, partner, emoji, expires_at)
  values (v_uid, 'drop', p_drop_id, v_drop.prize,
          coalesce((select name from partners where id = v_drop.partner_id), ''),
          '🎁', now() + interval '30 days')
  returning * into v_row;
  return v_row;
end;
$$;

-- Lancer un duel 7 jours contre un rival.
create or replace function start_duel(p_rival uuid)
returns duels language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row duels%rowtype;
  v_city uuid;
begin
  if v_uid is null then raise exception 'authentification requise'; end if;
  if v_uid = p_rival then raise exception 'duel contre soi-même impossible'; end if;
  if exists (select 1 from duels
              where status = 'active' and ends_at > now()
                and ((a_user_id = v_uid and b_user_id = p_rival)
                  or (a_user_id = p_rival and b_user_id = v_uid))) then
    raise exception 'duel déjà actif avec ce rival';
  end if;
  select city_id into v_city from profiles where id = v_uid;
  insert into duels (a_user_id, b_user_id, city_id, started_at, ends_at, status)
  values (v_uid, p_rival, v_city, now(), now() + interval '7 days', 'active')
  returning * into v_row;
  return v_row;
end;
$$;

-- Règle les duels échus (cron) : fige les scores et désigne le vainqueur.
create or replace function settle_duels()
returns void language plpgsql security definer set search_path = public as $$
begin
  update duels d
     set a_painted_m = l.a_live_m,
         b_painted_m = l.b_live_m,
         status = case
                    when l.a_live_m > l.b_live_m then 'a_won'
                    when l.b_live_m > l.a_live_m then 'b_won'
                    else 'draw' end
  from duel_live l
  where l.id = d.id and d.status = 'active' and d.ends_at <= now();
end;
$$;

-- Anti-triche v1 (inchangé) — conservé ici pour la complétude si 0001 absent.
create or replace function validate_run(p_run_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_kmh double precision;
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

-- Décroissance quotidienne (inchangé) — > 30 j → cellule libérée.
create or replace function decay_territory()
returns void language sql security definer set search_path = public as $$
  delete from territory_cells where now() - last_seen > interval '30 days';
$$;

-- Rollover de saison : clôture les saisons échues, fige le palmarès, ouvre la
-- suivante, et neutralise le territoire de la ville (nouvelle carte).
create or replace function rollover_seasons()
returns void language plpgsql security definer set search_path = public as $$
declare s record;
begin
  for s in select * from seasons where status = 'live' and ends_at <= now() loop
    -- palmarès des équipes
    insert into season_results (season_id, city_id, podium, champion)
    select s.id, s.city_id,
      coalesce((
        select jsonb_agg(jsonb_build_object('team_slug', t.slug, 'cells', ts.cells)
                         order by ts.cells desc)
        from team_scores ts join teams t on t.id = ts.team_id
        where ts.city_id = s.city_id), '[]'),
      (select jsonb_build_object('pseudo', rs.pseudo, 'team_slug', rs.team_slug,
                                 'painted_km', round((rs.total_painted_m/1000)::numeric, 1))
       from runner_scores rs where rs.city_id = s.city_id
       order by rs.total_painted_m desc limit 1)
    on conflict (season_id) do nothing;

    update seasons set status = 'closed' where id = s.id;

    insert into seasons (city_id, number, starts_at, ends_at, duration_days, status)
    values (s.city_id, s.number + 1, now(),
            now() + (s.duration_days || ' days')::interval, s.duration_days, 'live');

    -- nouvelle carte : on repart de zéro pour la ville
    delete from territory_cells where city_id = s.city_id;

    insert into feed_events (city_id, kind, text)
    values (s.city_id, 'season', 'Saison ' || (s.number + 1) || ' — la carte est remise à zéro !');
  end loop;
end;
$$;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 6. RLS — activation + policies sur TOUTES les tables publiques
-- ============================================================================

-- Nettoyage des policies nommées de 0001 (remplacées ci-dessous).
drop policy if exists "profiles: lecture publique (pseudo/équipe)" on profiles;
drop policy if exists "profiles: maj par soi-même" on profiles;
drop policy if exists "profiles: insert par soi-même" on profiles;
drop policy if exists "runs: lecture publique" on runs;
drop policy if exists "runs: insert par soi-même" on runs;
drop policy if exists "runs: maj par soi-même" on runs;
drop policy if exists "run_points: lecture publique hors privacy" on run_points;
drop policy if exists "run_points: insert sur ses runs" on run_points;
drop policy if exists "territory: lecture publique" on territory_cells;
drop policy if exists "prizes: lecture par le gagnant" on prizes_won;
drop policy if exists "qualifiers: lecture par soi" on drop_qualifiers;

alter table cities            enable row level security;
alter table teams             enable row level security;
alter table profiles          enable row level security;
alter table runs              enable row level security;
alter table run_points        enable row level security;
alter table territory_cells   enable row level security;
alter table partners          enable row level security;
alter table challenges        enable row level security;
alter table drops             enable row level security;
alter table drop_qualifiers   enable row level security;
alter table prizes_won        enable row level security;
alter table seasons           enable row level security;
alter table season_results    enable row level security;
alter table friendships       enable row level security;
alter table duels             enable row level security;
alter table feed_events       enable row level security;
alter table achievements      enable row level security;

-- Tables de référence : lecture publique, écriture réservée au service_role
-- (les fonctions SECURITY DEFINER et le back-office contournent la RLS).
drop policy if exists ref_read_cities on cities;
create policy ref_read_cities on cities for select using (true);
drop policy if exists ref_read_teams on teams;
create policy ref_read_teams on teams for select using (true);
drop policy if exists ref_read_partners on partners;
create policy ref_read_partners on partners for select using (true);
drop policy if exists ref_read_challenges on challenges;
create policy ref_read_challenges on challenges for select using (status <> 'draft');
drop policy if exists ref_read_drops on drops;
create policy ref_read_drops on drops for select using (true);
drop policy if exists ref_read_seasons on seasons;
create policy ref_read_seasons on seasons for select using (true);
drop policy if exists ref_read_season_results on season_results;
create policy ref_read_season_results on season_results for select using (true);

-- profiles : lecture publique (pseudo/équipe), écriture par soi-même.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (true);
drop policy if exists profiles_insert_self on profiles;
create policy profiles_insert_self on profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- runs : lecture publique, écriture par soi-même.
drop policy if exists runs_read on runs;
create policy runs_read on runs for select using (true);
drop policy if exists runs_insert_self on runs;
create policy runs_insert_self on runs for insert with check (auth.uid() = user_id);
drop policy if exists runs_update_self on runs;
create policy runs_update_self on runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- run_points : les points privés ne SORTENT jamais ; insert sur ses propres runs.
drop policy if exists run_points_read_public on run_points;
create policy run_points_read_public on run_points for select using (is_private = false);
drop policy if exists run_points_insert_own on run_points;
create policy run_points_insert_own on run_points for insert
  with check (exists (select 1 from runs r where r.id = run_id and r.user_id = auth.uid()));

-- territory_cells : lecture publique ; écriture uniquement via score_run (definer).
drop policy if exists territory_read on territory_cells;
create policy territory_read on territory_cells for select using (true);

-- feed_events : lecture publique ; écriture uniquement serveur (definer/triggers).
drop policy if exists feed_read on feed_events;
create policy feed_read on feed_events for select using (true);

-- duels : lecture publique (affichés dans le feed) ; insert via start_duel
--         (definer), donc pas de policy d'insert client ; mise à jour serveur.
drop policy if exists duels_read on duels;
create policy duels_read on duels for select using (true);

-- friendships : visibles/écrites par les personnes concernées.
drop policy if exists friends_read on friendships;
create policy friends_read on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists friends_insert on friendships;
create policy friends_insert on friendships for insert with check (auth.uid() = user_id);
drop policy if exists friends_delete on friendships;
create policy friends_delete on friendships for delete using (auth.uid() = user_id);

-- drop_qualifiers : self ; insert validé par possession du run.
drop policy if exists qualifiers_read_self on drop_qualifiers;
create policy qualifiers_read_self on drop_qualifiers for select using (auth.uid() = user_id);
drop policy if exists qualifiers_insert_self on drop_qualifiers;
create policy qualifiers_insert_self on drop_qualifiers for insert
  with check (auth.uid() = user_id
              and exists (select 1 from runs r where r.id = run_id and r.user_id = auth.uid()));

-- prizes_won : lecture par le gagnant ; AUCUN insert client (mint via claim_drop).
drop policy if exists prizes_read_self on prizes_won;
create policy prizes_read_self on prizes_won for select using (auth.uid() = user_id);

-- achievements : gérés par soi-même.
drop policy if exists ach_read_self on achievements;
create policy ach_read_self on achievements for select using (auth.uid() = user_id);
drop policy if exists ach_write_self on achievements;
create policy ach_write_self on achievements for insert with check (auth.uid() = user_id);

-- ============================================================================
-- 7. Droits d'exécution des RPC exposées au client
-- ============================================================================

grant execute on function claim_drop(uuid) to authenticated;
grant execute on function start_duel(uuid) to authenticated;
-- score_run / validate_run / settle_duels / decay_territory / rollover_seasons
-- ne sont appelées que par le service_role (edge functions / cron). On retire
-- le droit par défaut accordé à PUBLIC pour les verrouiller côté client.
revoke execute on function score_run(uuid)        from public;
revoke execute on function validate_run(uuid)     from public;
revoke execute on function settle_duels()         from public;
revoke execute on function decay_territory()      from public;
revoke execute on function rollover_seasons()     from public;

-- ============================================================================
-- 8. Realtime — flux temps réel pour la carte et le feed
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- ajoute les tables au flux (ignore si déjà présentes)
    begin alter publication supabase_realtime add table territory_cells; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table feed_events;     exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table duels;           exception when duplicate_object then null; end;
  end if;
end $$;

-- ============================================================================
-- 9. Cron (pg_cron) — décroissance, règlement des duels, rollover de saison
--    Optionnel : ne s'exécute que si l'extension pg_cron est disponible.
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job
      where jobname in ('decay-territory', 'settle-duels', 'rollover-seasons');
    perform cron.schedule('decay-territory',  '0 4 * * *',    $cron$select decay_territory()$cron$);
    perform cron.schedule('settle-duels',     '*/30 * * * *', $cron$select settle_duels()$cron$);
    perform cron.schedule('rollover-seasons', '15 0 * * *',   $cron$select rollover_seasons()$cron$);
  else
    raise notice 'pg_cron indisponible : planifier decay/settle/rollover via Scheduled Edge Functions.';
  end if;
end $$;

commit;
