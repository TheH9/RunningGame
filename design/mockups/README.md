# Maquettes Bornes 🎨

Maquettes haute-fidélité (iOS + Android), fidèles au [design system](../../docs/03-design-systeme-visuel.md). Conquête **par rue** ([ADR-001](../../docs/decisions/ADR-001-conquete-par-rue.md)).

## L'app complète — 12 écrans (`app/`)

| # | Écran | Fichier |
|---|-------|---------|
| 01 | Onboarding | `app/01-onboarding.png` |
| 02 | Choix d'équipe | `app/02-choix-equipe.png` |
| 03 | Map (accueil) | `app/03-map.png` |
| 04 | Run actif (live) | `app/04-run-actif.png` |
| 05 | Fin de run (Story 9:16) | `app/05-fin-de-run.png` |
| 06 | Classement | `app/06-classement.png` |
| 07 | Défi du mois | `app/07-defi.png` |
| 08 | Récompenses | `app/08-recompenses.png` |
| 09 | Lot / QR (boutique) | `app/09-lot-qr.png` |
| 10 | Profil | `app/10-profil.png` |
| 11 | Bornes+ (premium) | `app/11-bornes-plus.png` |
| 12 | Drop ! (alerte) | `app/12-drop.png` |

Vue d'ensemble : `app/_all.png`.

## Sources & régénération

- `bornes-app.html` — **les 12 écrans de l'app** (source éditable).
- `bornes-mockups.html` — comparatif map *par rue* vs *hexagones* (historique de décision).
- Rendu :
  ```bash
  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules \
    node render-app.js        # → app/
  ```

## Notes
- **Carte dessinée** (vraies tuiles Mapbox bloquées par le réseau de cet environnement). En prod : vrai style Mapbox + ville réelle.
- **Polices système** ici ; en prod : Satoshi/Clash Display (titres) + Inter (texte).
- **QR** décoratif.
