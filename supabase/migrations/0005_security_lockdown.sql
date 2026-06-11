-- Bornes — migration 0005 : durcissement sécurité (suite aux advisors Supabase).
-- Idempotente.
--
-- Corrige :
--   1. Vues territory_owner / team_scores créées en 0001 sans security_invoker
--      (sinon elles s'exécutent avec les droits du créateur → ERROR du linter).
--   2. set_updated_at sans search_path fixe (WARN function_search_path_mutable).
--   3. Verrouillage des fonctions serveur : le `revoke ... from public` de 0002
--      ne retirait pas l'EXECUTE accordé par défaut aux rôles `anon` /
--      `authenticated` de Supabase. On les révoque explicitement pour que ces
--      RPC SECURITY DEFINER ne soient PAS appelables depuis le client.
--      (claim_drop / start_duel restent volontairement ouverts à authenticated.)

begin;

-- 1. Vues : appliquer la RLS de l'appelant, pas du créateur.
alter view territory_owner set (security_invoker = true);
alter view team_scores    set (security_invoker = true);

-- 2. Trigger générique : search_path déterministe.
alter function set_updated_at() set search_path = public;

-- 3. Fonctions serveur (cron / edge functions via service_role uniquement).
revoke execute on function score_run(uuid)        from anon, authenticated, public;
revoke execute on function validate_run(uuid)     from anon, authenticated, public;
revoke execute on function settle_duels()         from anon, authenticated, public;
revoke execute on function decay_territory()      from anon, authenticated, public;
revoke execute on function rollover_seasons()     from anon, authenticated, public;
revoke execute on function handle_new_user()      from anon, authenticated, public;

-- RPC client : réservés aux utilisateurs connectés (retirer l'accès anon
-- hérité de PUBLIC ; le grant à `authenticated` vient de 0002).
revoke execute on function claim_drop(uuid) from anon, public;
revoke execute on function start_duel(uuid) from anon, public;

commit;
