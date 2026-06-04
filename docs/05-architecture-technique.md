# 05 — Architecture technique

> Objectif V1 : **MVP buildable en 6-8 semaines**. On choisit des briques éprouvées, pas de sur-ingénierie. On ne réinvente ni le tracking GPS, ni le backend géospatial.

## Stack proposée (à valider)

| Couche | Choix proposé | Justification |
|--------|---------------|---------------|
| Mobile | **React Native (Expo)** ou **Flutter** | Cross-platform, vélocité, une seule équipe |
| Carte | **Mapbox** (SDK natif via wrapper) | Style premium customisable — non négociable (cf. design) |
| Graphe de rues | **OpenStreetMap** (import + découpage en segments) | Unité de capture = la rue ([ADR-001](decisions/ADR-001-conquete-par-rue.md)) |
| Map-matching | **Valhalla / Meili** (ou OSRM, GraphHopper) | Coller la trace GPS bruitée sur le bon segment de rue |
| Tracking background | **Transistor Software — Background Geolocation** | SDK robuste, gère iOS/Android background, batterie |
| Backend | **Supabase** (Postgres + **PostGIS**) | Auth, DB géospatiale, temps réel, edge functions, rapide à lever |
| Temps réel | Supabase Realtime / WebSocket | Maj carte live, drops, scores |
| Notifications push | Expo Push / FCM + APNs | Drops, défis, « ton quartier bascule » |
| Stockage médias | Supabase Storage / CDN | Vidéos de fin de run |
| Génération vidéo run | Côté client (rendu local) en V1 | Évite coût serveur ; fallback serveur si besoin |

> ⚠️ Mapbox vs SDK natif Maps : Mapbox est imposé par l'exigence visuelle. Vérifier les coûts (MAU) tôt.

## Modèle de données (esquisse)

```
users        (id, pseudo, team_id, home_privacy_geom, created_at)
teams        (id, city_id, color, name)
cities       (id, name, bbox_geom)
neighborhoods(id, city_id, name, osm_geom)          -- via OpenStreetMap
streets      (id, city_id, name, osm_way_id, geom, length_m)   -- segments OSM
street_state (street_id, team_id, captured_at, last_seen_at, decay_state)
zones        (id, neighborhood_id, name, osm_geom)  -- parcs/berges (fallback hors-rue)
zone_state   (zone_id, team_id, captured_at, last_seen_at, decay_state)
runs         (id, user_id, started_at, ended_at, distance_m, track_geom, status)
run_streets  (run_id, street_id, covered_ratio)     -- rues matchées sur ce run
challenges   (id, neighborhood_id, partner_id, month, prize, status)
drops        (id, point_geom, radius_m, window_start, window_end, prize, status)
prizes_won   (id, user_id, source_type, qr_code, status, expires_at)
partners     (id, name, shop_geom, contact)
```

> Segments OSM découpés aux intersections. Capture d'un segment si `covered_ratio ≥ 0.7` (seuil à confirmer terrain).

## Flux clés

### Capture de rues (fin de run)
1. Le client enregistre la `track_geom` (GPS).
2. À la fin : passage anti-triche (vitesse, téléportation — voir [07](07-securite-conformite.md)).
3. Si valide : **map-matching** de la trace sur le graphe → liste des `streets` parcourues + `covered_ratio`. Les segments au-dessus du seuil → upsert `street_state` (couleur = équipe, `last_seen_at` = now). Parcs/berges traversés → `zone_state`.
4. Application du **floutage Privacy Zone** : rues dans la zone domicile/bureau comptées pour les stats mais **non capturées publiquement**.
5. Recalcul des scores quartier/équipe (par longueur de rue) → push temps réel.

### Décroissance (job planifié)
- Cron quotidien : `street_state` (et `zone_state`) avec `last_seen_at` > 14 j → `decay_state = pâlissant` ; > 30 j → `team_id = null` (neutre).

### Drop
- Création d'un drop (point + rayon + fenêtre temporelle). Pendant la fenêtre, tout run actif passant dans le rayon → joueur ajouté aux qualifiés. Fin de fenêtre → tirage au sort → `prizes_won`.

## Performance & échelle

- **Densité locale** = peu de données au départ → simple. Le vrai enjeu perf est la **maj temps réel de la carte** et l'agrégation des % de contrôle.
- Indexer `street_state` sur `street_id` et `team_id` ; index spatial (PostGIS) sur `streets.geom` ; pré-agréger les % (longueur) par quartier (vue matérialisée rafraîchie).
- Scalabilité **ville par ville** : chaque ville est un périmètre quasi indépendant → sharding naturel.

## Décisions ouvertes (à trancher)

- [ ] React Native vs Flutter ?
- [ ] Moteur de map-matching : Valhalla/Meili vs OSRM vs GraphHopper ?
- [ ] Seuil de capture d'un segment (`covered_ratio`) après test terrain.
- [ ] Génération vidéo : 100 % client ou pipeline serveur ?
- [ ] Mapbox : budget MAU acceptable à l'échelle visée ?
