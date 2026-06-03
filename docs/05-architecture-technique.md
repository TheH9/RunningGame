# 05 — Architecture technique

> Objectif V1 : **MVP buildable en 6-8 semaines**. On choisit des briques éprouvées, pas de sur-ingénierie. On ne réinvente ni le tracking GPS, ni le backend géospatial.

## Stack proposée (à valider)

| Couche | Choix proposé | Justification |
|--------|---------------|---------------|
| Mobile | **React Native (Expo)** ou **Flutter** | Cross-platform, vélocité, une seule équipe |
| Carte | **Mapbox** (SDK natif via wrapper) | Style premium customisable — non négociable (cf. design) |
| Géo grille | **Uber H3** (lib officielle) | Hexagones standard, perf, écosystème |
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
hex_state    (h3_index, team_id, captured_at, last_seen_at, decay_state)
runs         (id, user_id, started_at, ended_at, distance_m, track_geom, status)
run_hexes    (run_id, h3_index)                      -- hexagones traversés
challenges   (id, neighborhood_id, partner_id, month, prize, status)
drops        (id, h3_index, window_start, window_end, prize, status)
prizes_won   (id, user_id, source_type, qr_code, status, expires_at)
partners     (id, name, shop_geom, contact)
```

> H3 à une résolution fixe (~150 m de diamètre = **résolution 9** environ). À confirmer par mesure terrain.

## Flux clés

### Capture d'hexagones (fin de run)
1. Le client enregistre la `track_geom` (GPS).
2. À la fin : passage anti-triche (vitesse, téléportation — voir [07](07-securite-conformite.md)).
3. Si valide : conversion de la trace en liste de H3 traversés → upsert `hex_state` (couleur = équipe du joueur, `last_seen_at` = now).
4. Application du **floutage Privacy Zone** : hexagones dans la zone domicile/bureau comptés pour les stats mais **non capturés publiquement**.
5. Recalcul des scores quartier/équipe → push temps réel.

### Décroissance (job planifié)
- Cron quotidien : hexagones avec `last_seen_at` > 14 j → `decay_state = pâlissant` ; > 30 j → `team_id = null` (neutre).

### Drop
- Création d'un drop (fenêtre temporelle). Pendant la fenêtre, tout run actif traversant l'hexagone → joueur ajouté aux qualifiés. Fin de fenêtre → tirage au sort → `prizes_won`.

## Performance & échelle

- **Densité locale** = peu de données au départ → simple. Le vrai enjeu perf est la **maj temps réel de la carte** et l'agrégation des % de contrôle.
- Indexer `hex_state` sur `h3_index` et `team_id` ; pré-agréger les % par quartier (vue matérialisée rafraîchie).
- Scalabilité **ville par ville** : chaque ville est un périmètre quasi indépendant → sharding naturel.

## Décisions ouvertes (à trancher)

- [ ] React Native vs Flutter ?
- [ ] Résolution H3 exacte (8 vs 9) après test terrain.
- [ ] Génération vidéo : 100 % client ou pipeline serveur ?
- [ ] Mapbox : budget MAU acceptable à l'échelle visée ?
