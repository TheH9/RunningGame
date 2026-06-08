# 11 — Plan de démarrage (kickoff) 🚀

> Tu veux **commencer**. Voici le plan complet, concret, du design validé jusqu'au premier build testable. Le design est ton avantage → il est déjà fait à ~80 % (12 maquettes), on protège cette qualité jusqu'au code.

## 0. Où on en est

✅ Vision, stratégie, modèle éco, conformité — documentés.
✅ **Décision conquête par rue** actée ([ADR-001](decisions/ADR-001-conquete-par-rue.md)).
✅ **Design system** + **12 écrans haute-fidélité** (`design/mockups/app/`).
⬜ Code : rien encore — on démarre.

## 1. Parcours complet de l'app (12 écrans)

```
        ┌─────────────┐
        │ 01 Onboarding│
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │02 Choix équipe│  (définitif · nudge vers la + faible)
        └──────┬──────┘
               ▼
   ┌────────────────────────── NAV PRINCIPALE (4 onglets) ──────────────────────────┐
   │  03 MAP        06 Classement      08 Récompenses        10 Profil               │
   │   │                                   │                    │                   │
   │   ▼                                   ▼                    ▼                   │
   │  04 Run actif                     09 Lot / QR          11 Bornes+              │
   │   │  (live)                       (retrait boutique)   (premium)               │
   │   ▼                                                                            │
   │  05 Fin de run (Story 9:16) ──► partage Instagram                              │
   └────────────────────────────────────────────────────────────────────────────────┘
        ▲
        │  07 Défi du mois (détail)  ◄─ depuis Map / Récompenses
        │  12 Drop ! (push → écran d'alerte)  ◄─ notification
```

| # | Écran | Rôle | Fichier |
|---|-------|------|---------|
| 01 | Onboarding | Accroche + promesse | `app/01-onboarding.png` |
| 02 | Choix d'équipe | Appartenance + équilibrage | `app/02-choix-equipe.png` |
| 03 | Map | Écran d'accueil, conquête par rue | `app/03-map.png` |
| 04 | Run actif | Session live (chrono, rues prises) | `app/04-run-actif.png` |
| 05 | Fin de run | Moment viral Story 9:16 | `app/05-fin-de-run.png` |
| 06 | Classement | Camembert ville + leaderboard | `app/06-classement.png` |
| 07 | Défi du mois | Détail, barres d'équipes, lot | `app/07-defi.png` |
| 08 | Récompenses | Coffre-fort des lots | `app/08-recompenses.png` |
| 09 | Lot / QR | Retrait en boutique (Drive-to-Store) | `app/09-lot-qr.png` |
| 10 | Profil | Stats de conquête, historique | `app/10-profil.png` |
| 11 | Bornes+ | Paywall premium 4,99 € | `app/11-bornes-plus.png` |
| 12 | Drop ! | Alerte chasse au trésor | `app/12-drop.png` |

## 2. Stack de démarrage (décisions à figer en semaine 1)

| Brique | Choix recommandé | Pourquoi |
|--------|------------------|----------|
| App mobile | **Expo (React Native)** | iOS + Android, 1 codebase, démarrage rapide |
| Carte | **Mapbox** (`@rnmapbox/maps`) | Style premium = ton avantage visuel |
| Tracking | **Transistor Background Geolocation** | Fiable en arrière-plan iOS/Android |
| Map-matching | **Valhalla / Meili** (service) | Coller la trace GPS sur les rues OSM |
| Backend | **Supabase** (Postgres + PostGIS) | Auth + DB géo + temps réel + edge functions |
| Graphe rues | **OpenStreetMap** (import par ville) | Unité de capture |
| Push | Expo Push / FCM + APNs | Drops, défis |

> Détails & modèle de données : [05-architecture-technique](05-architecture-technique.md).

## 3. Plan sprint par sprint (8 semaines → bêta)

### Sprint 1 (sem. 1-2) — Fondations
- [ ] Init repo **Expo** + navigation 4 onglets + thème (tokens du design system)
- [ ] Intégrer **Mapbox** + appliquer le **style custom** (clair + sombre)
- [ ] Auth Supabase + écrans **01 Onboarding** et **02 Choix d'équipe**
- [ ] Modèle de données (streets, street_state, runs…) + import OSM d'**un** quartier
- **Démo attendue :** je me connecte, je choisis mon équipe, je vois la carte premium.

### Sprint 2 (sem. 3-4) — Le run & la capture
- [ ] SDK **Background Geolocation** : démarrer/arrêter un run, trace GPS
- [ ] **Map-matching** trace → rues + règle de capture (`covered_ratio ≥ 0.7`)
- [ ] Écran **04 Run actif** (chrono, distance, rues prises en live)
- [ ] Rendu des **rues colorées** par équipe sur la carte (écran 03)
- **Démo attendue :** je cours, mes rues se colorent à la fin.

### Sprint 3 (sem. 5-6) — Méta-jeu & moment viral
- [ ] **06 Classement** (camembert + leaderboard, scores par longueur de rue)
- [ ] **07 Défi du mois** + **08 Récompenses**
- [ ] ⭐ **05 Fin de run** : animation vague + export vidéo 9:16 + partage Story
- **Démo attendue :** je termine un run et je partage ma vague en Story.

### Sprint 4 (sem. 7-8) — Lots, conformité & polish
- [ ] **09 Lot / QR** (unique, usage unique) + parcours retrait boutique
- [ ] **12 Drop** (fenêtre + tirage) + push
- [ ] Privacy Zone 200 m + anti-triche v1 (22 km/h, anti-téléport) + RGPD/règlement
- [ ] Mode sombre, micro-interactions, haptique → **build bêta**
- **Démo attendue :** app testable en conditions réelles par les bêta-testeurs.

> 🎯 **Zone de lancement retenue : 92 nord — Asnières-sur-Seine / Levallois / Clichy / Bois-Colombes.** Bassin dense et continu le long de la Seine, idéal pour la densité locale.

## 4. Ce qu'on fait CETTE semaine (pour démarrer)

1. **Zone figée** : Asnières / Levallois / Clichy / Bois-Colombes. Valider les **noms d'équipes**.
2. **Créer les comptes** : Mapbox, Supabase, (Transistor en sprint 2).
3. **Scaffolder le repo Expo** + brancher le design system (couleurs, typo, composants de base).
4. **Importer le graphe OSM** du quartier choisi dans PostGIS.
5. (Design) Convertir le style de carte dessiné en **vrai style Mapbox** + charger les **vraies polices** (Satoshi/Inter).

## 5. Définition de « prêt à lancer la bêta »
- [ ] Parcours complet : onboarding → équipe → run → capture de rues → fin de run partageable
- [ ] 1 défi sponsorisé actif + 1 lot retirable en boutique (QR)
- [ ] Conforme RGPD/CNIL sur la géoloc + règlement de jeu
- [ ] Mode clair **et** sombre, fluide, premium (passe la checklist screenshotable)
- [ ] 3-5 partenaires locaux + 2-3 clubs prêts à amener les premiers coureurs

## 6. Risques à garder en tête
| Risque | Parade |
|--------|--------|
| Map-matching bruité | Service éprouvé (Valhalla) + lissage + seuil de capture |
| Carte vide au lancement | Mono-zone + clubs + feuilleton local ([09](09-go-to-market.md)) |
| Dérive de scope | On s'en tient aux 12 écrans + hors-scope strict ([08](08-roadmap-mvp.md)) |
| Perte de la qualité visuelle au code | Design tokens + revue visuelle à chaque écran |
