-- Bornes — migration 0008 : retrait du contenu de démonstration (passage prod).
-- Idempotente. Supprime le partenaire fictif « Café des Bornes » (seed 0003)
-- et tout ce qui en dépend : défi, drop, qualifications, lots de test, feed.
-- La saison live reste (structurelle). Les vrais partenaires arrivent via le
-- back-office, jamais via les migrations.

begin;

-- lots de test liés aux drops/défis du partenaire fictif (source_id sans FK)
delete from prizes_won pw
where (pw.source_type = 'drop' and pw.source_id in (
        select d.id from drops d
        join partners p on p.id = d.partner_id
        where p.name = 'Café des Bornes'))
   or (pw.source_type = 'challenge' and pw.source_id in (
        select ch.id from challenges ch
        join partners p on p.id = ch.partner_id
        where p.name = 'Café des Bornes'));

-- qualifications des drops fictifs
delete from drop_qualifiers dq
where dq.drop_id in (
  select d.id from drops d
  join partners p on p.id = d.partner_id
  where p.name = 'Café des Bornes');

-- événements de feed mentionnant le partenaire fictif
delete from feed_events where text ilike '%Café des Bornes%';

-- drop, défi, puis le partenaire lui-même
delete from drops d
  using partners p
  where p.id = d.partner_id and p.name = 'Café des Bornes';

delete from challenges ch
  using partners p
  where p.id = ch.partner_id and p.name = 'Café des Bornes';

delete from partners where name = 'Café des Bornes';

commit;
