# Bornes — app mobile (Expo)

**App complète jouable en mode démo** (multijoueur simulé, persisté localement) :
cours, peins ta trace, conquiers ta ville, défie tes amis — la carte est remise
à zéro à chaque saison (6 semaines).
Décisions produit : [ADR-002](../docs/decisions/ADR-002-trail-paint.md) · [ADR-003](../docs/decisions/ADR-003-affichage-territoire.md).

## Lancer

```bash
cd mobile && npm install && npx expo start   # scanner le QR avec Expo Go
```

- **Vrai run** : bouton GO (GPS réel, foreground).
- **Run démo** : appui long 1,5 s sur GO → replay simulé qui traverse des zones
  adverses et le drop (idéal pour montrer le jeu sans courir).
- **Web** : `npx expo start --web` (le replay est le mode par défaut).
- **Fin de saison forcée** (web) : ajouter `?debugSeasonEnd=1` à l'URL.

## Mode démo vs production

Sans variables d'env, l'app tourne sur `DemoBackend` : 10 rivaux (bots) qui
courent en live et peignent la carte, duels, drop hebdo, feed, rattrapage
accéléré du temps manqué. Tout passe par l'interface `GameBackend`
(`src/backend/`) — poser les clés bascule sur `SupabaseBackend` sans toucher
aux écrans :

```bash
EXPO_PUBLIC_SUPABASE_URL=...        # + appliquer ../supabase/migrations
EXPO_PUBLIC_SUPABASE_ANON_KEY=...   # + déployer l'edge function score-run
```

## Architecture

```
src/app/                  # routes expo-router
  onboarding → team → (tabs: Map · Classement · Défis · Récompenses · Profil)
  run (sombre, curseur GPS fixe + comète) · summary (story 9:16 partageable)
  season-recap · feed · reward-qr · settings
src/backend/              # GameBackend (interface) · DemoBackend · SupabaseBackend
  botEngine (rivaux live) · demoSeed (monde initial)
src/components/map/       # MapView (caméra GPU, pinch LOD veines↔hex, tap
  inspection → StreetCard) · CityBase (fake-3D) · TerritoryVeins/Hexes · Bots
src/store/                # app · run (GPS/replay, segments, anti-triche,
  snapshot) · territory (cellules H3 multi-équipes) · season · social · events
src/lib/                  # world (ville géoréférencée, graphe d'intersections)
  geo · territory (règles de conflit) · runDirector (événements live)
```

## Vérification

```bash
npx tsc --noEmit
npx expo export --platform web
node scripts/verify-web.mjs   # parcours complet automatisé + screenshots .verify/
```

## Règles du jeu (implémentées)

- **Conflit** : scores coexistants par cellule H3 (~25 m) et par équipe ;
  propriétaire = équipe dominante ; écart < 30 % → « contesté » (pointillés
  bicolores) ; on reprend en repassant. Décroissance 14 j (pâlit) / 30 j (neutre).
- **Saisons** : 42 jours, rollover automatique (même après absence), récap
  podium + hall of fame, carte vierge + léger re-seed.
- **Anti-triche** : >25 km/h soutenu = peinture suspendue ; >40 km/h = run
  non soumis. Perte GPS = auto-pause + segments (pas de trait fantôme).
- **Privacy Zone** : la trace publique saute la zone (réglages).
