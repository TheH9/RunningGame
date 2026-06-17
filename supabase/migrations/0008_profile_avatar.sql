-- Bornes — migration 0008 : avatar personnalisable (DiceBear) sur le profil.
-- Idempotente. L'avatar est une config cosmétique (non-PII) stockée en jsonb ;
-- elle doit être lisible publiquement pour afficher l'avatar des autres joueurs
-- (profiles est déjà en lecture publique via RLS).

begin;

alter table profiles add column if not exists avatar jsonb;

-- Vue runner_scores (cf. 0002) — on ajoute p.avatar pour le classement / rivaux.
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
  count(r.id) filter (where r.started_at > now() - interval '7 days')                    as runs_week,
  -- nouvelle colonne ajoutée EN FIN (create or replace view n'insère pas au milieu)
  p.avatar
from profiles p
join teams t on t.id = p.team_id
left join runs r on r.user_id = p.id and r.status = 'finished'
group by p.id, p.pseudo, p.city_id, t.id, t.slug, p.signature_street, p.title, p.avatar;

commit;
