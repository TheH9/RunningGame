# Bornes — app mobile (Expo)

**Jeu de course multijoueur en production** (backend Supabase : comptes, runs,
territoire, duels, drops) : cours, peins ta trace sur la vraie carte de ta
ville, conquiers-la, défie les autres équipes — la carte est remise à zéro à
chaque saison (6 semaines).
Décisions produit : [ADR-002](../docs/decisions/ADR-002-trail-paint.md) · [ADR-003](../docs/decisions/ADR-003-affichage-territoire.md).

## Lancer

```bash
cd mobile && npm install && npx expo start   # scanner le QR avec Expo Go
```

- `npm install` crée `mobile/.env` (clés publiques Supabase) via `ensure-env`.
- **Compte obligatoire** : e-mail (code OTP) — Apple/Google arrivent avec le
  dev build ([go-live](../docs/12-go-live.md)).
- **Run** : bouton GO (GPS réel, foreground uniquement).

## Backend

`SupabaseBackend` est l'unique backend (`src/backend/`) : lectures via les
vues/RPC publiques (RLS), écritures sous la session utilisateur, scoring côté
serveur (edge function `score-run`), feed temps réel (Realtime). Les écrans ne
connaissent que l'interface `GameBackend`. Sans variables d'env (build mal
configuré), l'auth bloque et les lectures retombent sur du vide — jamais de
contenu simulé.

## Carte

Fond de carte **réel** (tuiles raster, vraies rues) sous les calques de jeu :
CARTO/OpenStreetMap sans clé par défaut, styles Mapbox si `EXPO_PUBLIC_MAPBOX_TOKEN`
(`pk.*`) est posé — styles custom Mapbox Studio via
`EXPO_PUBLIC_MAPBOX_STYLE_DARK` / `_LIGHT` (`username/styleId`). Le monde
s'ancre sur la position du joueur à l'ouverture de la carte (1 fix, jamais de
suivi) ; nom de ville et de rue via le geocoder natif. Le SDK natif Mapbox
(vecteur) viendra avec le dev build.

## Architecture

```
src/app/                  # routes expo-router
  auth → onboarding → team → (tabs: Map · Classement · Défis · Récompenses · Profil)
  run (sombre, curseur GPS fixe + comète) · summary (story 9:16 partageable)
  season-recap · feed · reward-qr · settings · legal
src/backend/              # GameBackend (interface) · SupabaseBackend
src/components/map/       # MapView (caméra GPU, pinch LOD veines↔hex, tap
  inspection → StreetCard) · RealBasemap (tuiles) · TerritoryVeins/Hexes
src/store/                # app · auth · run (GPS, segments, anti-triche,
  snapshot) · territory (cellules H3 multi-équipes) · season · social · events
src/lib/                  # geo · territory (règles de conflit) · locate
  (ancrage + geocoder) · runDirector (événements live) · supabase
```

## Vérification

```bash
npx tsc --noEmit
npm test            # Jest — logique pure + mécanique de jeu (stores)
```

75 tests (env Node, sans device), en deux niveaux :

- **Logique pure** (`src/lib`) : géométrie de trace (haversine, Douglas-Peucker,
  allure, Privacy Zone), règles de conflit territorial (`cellView`/`paintCells`,
  fading 14 j / neutre 30 j), monde géoréférencé (projection aller-retour).
- **Stores** (`src/store`) : moteur de run de bout en bout via une source GPS
  factice (distance, segments coupés sur trou GPS, filtre de précision,
  anti-triche 25/40 km/h, Privacy Zone), territoire live et stats de profil
  (records d'allure, cumuls, découverte).

Mocks légers (`react-native` Platform, `AsyncStorage`, `locationSource`) — pas
de chaîne Expo/Reanimated. Le reste (écrans, GPS réel, rendu carte) relève du
plan de tests manuel/device.

## Règles du jeu (implémentées)

- **Conflit** : scores coexistants par cellule H3 (~25 m) et par équipe ;
  propriétaire = équipe dominante ; écart < 30 % → « contesté » (pointillés
  bicolores) ; on reprend en repassant. Décroissance 14 j (pâlit) / 30 j (neutre).
- **Saisons** : 42 jours, rollover côté serveur (`rollover_seasons`, cron),
  récap podium + hall of fame, carte remise à zéro.
- **Anti-triche** : >25 km/h soutenu = peinture suspendue ; >40 km/h = run
  non soumis (re-validé côté serveur). Perte GPS = auto-pause + segments.
- **Privacy Zone** : la trace publique saute la zone (réglages).
