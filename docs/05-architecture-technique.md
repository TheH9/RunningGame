# 05 — Architecture technique

> Objectif V1 : **MVP buildable en 6-8 semaines**. On choisit des briques éprouvées, pas de sur-ingénierie. On ne réinvente ni le tracking GPS, ni le backend géospatial.

## Stack proposée (à valider)

| Couche | Choix proposé | Justification |
|--------|---------------|---------------|
| Mobile | **React Native (Expo)** ou **Flutter** | Cross-platform, vélocité, une seule équipe |
| Carte | **Mapbox** (SDK natif via wrapper) | Style premium customisable — non négociable (cf. design) |
| Conquête | **Trail Paint** — trace GPS peinte + scoring async en cellules H3 ([ADR-002](decisions/ADR-002-trail-paint.md)) | Visuel direct, pas de map-matching en MVP |
| Map-matching (V2) | Valhalla/Meili (ou OSRM, GraphHopper) | Rues exactes — amélioration post-MVP, non bloquant |
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

### Trail Paint — pendant & après le run ([ADR-002](decisions/ADR-002-trail-paint.md))
1. Client : trace GPS **simplifiée** (Douglas-Peucker ~5 m) → upload par batch → `run_points`.
2. **Rendu temps réel** : la trace se peint (Mapbox line layer) + curseur ; aucun map-matching requis pour l'affichage.
3. Anti-triche (vitesse > 40 km/h, trace « trop lisse », horodatage serveur — voir [07](07-securite-conformite.md)).
4. **Scoring asynchrone** (worker) : agrégation de la trace en cellules **H3 (~25 m)** → upsert `territory_cells` (score par équipe, `last_seen`). Zone = équipe au **score dominant**.
5. **Privacy Zone 200 m** : points dans la zone domicile/bureau comptés pour les stats mais **ni stockés ni affichés** publiquement.
6. Recalcul des `team_scores` (couverture) → push temps réel.

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
- [ ] Résolution H3 du scoring (~25 m = rés. 11 ?) après test terrain.
- [ ] Règle de conflit exacte (score dominant vs dernier passage) à figer avant compétition.
- [ ] (V2) Moteur de map-matching pour les rues exactes.
- [ ] Génération vidéo : 100 % client ou pipeline serveur ?
- [ ] Mapbox : budget MAU acceptable à l'échelle visée ?
