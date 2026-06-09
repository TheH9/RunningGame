# Bornes — app mobile (Expo)

MVP « Trail Paint » : cours, peins ta trace, conquiers ta ville.
Décisions produit : [ADR-002](../docs/decisions/ADR-002-trail-paint.md) (mécanique) · [ADR-003](../docs/decisions/ADR-003-affichage-territoire.md) (affichage).

## Lancer

```bash
cd mobile
npm install
npx expo start        # scanner le QR avec Expo Go
```

Sans configuration, l'app tourne en **mode démo hors-ligne** (tracking GPS réel,
territoire et classements mockés). Pour brancher le backend :

```bash
# .env (ou variables d'environnement)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Backend : appliquer `../supabase/migrations/0001_init.sql` (extensions `postgis` + `h3`)
et déployer l'edge function `score-run`.

## Structure

```
src/app/            # routes expo-router
  onboarding.tsx    # promesse + pseudo (sombre)
  team.tsx          # choix d'équipe (définitif saison)
  (tabs)/           # Map · Classement · Récompenses · Profil
  run.tsx           # run actif — curseur flèche + traînée comète (sombre)
  summary.tsx       # fin de run — stats + zones touchées
src/components/MapCanvas.tsx  # rendu carte SVG (placeholder Mapbox, même langage visuel)
src/store/          # zustand : app (persisté) + moteur de run (GPS)
src/lib/            # geo (haversine, Douglas-Peucker), territory (H3 rés. 11), supabase
src/theme/tokens.ts # design tokens (docs/03)
```

## Prochains lots (docs/08)

- **Carte vivante** : remplacer `MapCanvas` par `@rnmapbox/maps` (dev build) — veines au zoom rue, hexagones H3 au dézoom, temps réel Supabase.
- **Tracking background** : Transistor Background Geolocation (dev build).
- **Moment viral** : animation 9:16 partageable de fin de run.
- **Lots & conformité** : auth Supabase, QR codes, Privacy Zone effective, anti-triche.
