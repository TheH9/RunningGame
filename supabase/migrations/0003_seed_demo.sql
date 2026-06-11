-- Bornes — seed 0003 : contenu de démarrage pour Asnières.
-- Idempotent. À exécuter après 0001 + 0002. En prod, gérer via back-office.

begin;

-- Saison 1 live (42 jours) si aucune saison pour la ville.
insert into seasons (city_id, number, starts_at, ends_at, duration_days, status)
select c.id, 1, now(), now() + interval '42 days', 42, 'live'
from cities c
where c.slug = 'asnieres'
  and not exists (select 1 from seasons s where s.city_id = c.id);

-- Partenaire local.
insert into partners (city_id, name, shop_geom, contact)
select c.id, 'Café des Bornes',
       st_setsrid(st_makepoint(2.2860, 48.9100), 4326), 'hello@cafedesbornes.fr'
from cities c
where c.slug = 'asnieres'
  and not exists (select 1 from partners p where p.city_id = c.id and p.name = 'Café des Bornes');

-- Défi du mois.
insert into challenges (city_id, partner_id, title, month, prize, status)
select c.id, p.id, 'Peins 25 km ce mois-ci', date_trunc('month', now())::date,
       'Un café offert + dossard collector', 'live'
from cities c
join partners p on p.city_id = c.id and p.name = 'Café des Bornes'
where c.slug = 'asnieres'
  and not exists (
    select 1 from challenges ch
    where ch.city_id = c.id and ch.month = date_trunc('month', now())::date);

-- Drop ouvert 48 h autour du partenaire.
insert into drops (city_id, partner_id, point_geom, radius_m, window_start, window_end, prize, status)
select c.id, p.id, st_setsrid(st_makepoint(2.2860, 48.9100), 4326), 150,
       now(), now() + interval '48 hours', 'Goodies Bornes', 'open'
from cities c
join partners p on p.city_id = c.id and p.name = 'Café des Bornes'
where c.slug = 'asnieres'
  and not exists (
    select 1 from drops d
    where d.city_id = c.id and d.window_end > now() and d.status = 'open');

commit;
