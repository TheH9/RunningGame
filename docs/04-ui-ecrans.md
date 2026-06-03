# 04 — UI & écrans

> Voir d'abord le [système visuel](03-design-systeme-visuel.md). Ici on décrit la structure des écrans. **4 onglets épurés, zéro de plus.**

## Navigation : 4 onglets

```
┌─────────────────────────────────────────────┐
│                                             │
│                  CONTENU                    │
│                                             │
├──────────┬──────────┬──────────┬───────────┤
│   Map    │ Classmt  │ Récomp.  │  Profil   │
│  (🗺️)    │  (🏆)    │  (🎁)    │   (👤)    │
└──────────┴──────────┴──────────┴───────────┘
```

## Onglet 1 — La Map (central, écran d'accueil)

L'écran le plus important. Voir détail carte dans [03 §4](03-design-systeme-visuel.md).

```
┌─────────────────────────────────────────────┐
│  Belleville          🔵 42%   [avatar]      │  ← bandeau quartier + part équipe
│                                             │
│        ⬡ ⬡ ⬡                                │
│      ⬡ ⬡ ⬡ ⬡   ← hexagones pastel          │
│        ⬡ ✦ ⬡    ← ✦ = DROP or qui flashe    │
│      ⬡ ⬡ ⬡                                  │
│                                             │
│                                             │
│                 ╭───────╮                   │
│                 │ START │  ← bouton massif  │
│                 ╰───────╯                   │
└─────────────────────────────────────────────┘
```

- Territoires pastel transparents, zones de défi qui respirent, drops qui flashent.
- **START** massif et instinctif (couleur de l'équipe).
- Pendant un run : passage en **mode session** (chrono, distance, hexagones capturés en temps réel, vague de couleur qui s'étend en live).

## Onglet 2 — Classement Local

```
┌─────────────────────────────────────────────┐
│   Contrôle de Paris 11e                     │
│                                             │
│        ◔  ← camembert 4 couleurs            │
│      🔵 42%  🔴 28%  🟡 18%  🟢 12%          │
│                                             │
│   Leaderboard du quartier — Juin            │
│   1. 🔵 Léa          128 hex                │
│   2. 🔴 Marco        119 hex                │
│   3. 🟡 Sofia         97 hex                │
│   …                                         │
└─────────────────────────────────────────────┘
```

- **Camembert de contrôle** de la ville (les 4 couleurs).
- **Leaderboard du quartier du mois.**
- Le « feuilleton local » : *« Le 11e est presque bleu, les rouges doivent réagir. »*

## Onglet 3 — Récompenses (le Coffre-Fort)

```
┌─────────────────────────────────────────────┐
│   Défi du mois — République x Boutique X    │
│   [bannière co-brandée]   🔵 mène 38%       │
│                                             │
│   Mes lots                                  │
│   ┌───────────────┐                         │
│   │  ▓▓▓ QR ▓▓▓   │  Paire Asics            │
│   │               │  À retirer : Boutique X │
│   └───────────────┘  ⏳ expire dans 12 j    │
└─────────────────────────────────────────────┘
```

- Contient le **défi sponsorisé en cours** et surtout les **QR Codes des lots gagnés**.
- Le QR Code se scanne **en boutique partenaire** → cœur du modèle Drive-to-Store.

## Onglet 4 — Profil

```
┌─────────────────────────────────────────────┐
│   [avatar]  Léa — 🔵 Les Vagues             │
│                                             │
│   Stats de conquête                         │
│   312 hex · 47 km · 8 quartiers touchés     │
│                                             │
│   Historique (3 derniers mois — gratuit)    │
│   • Run du 02/06 — 12 hex — vidéo ▶         │
│   • Run du 31/05 — 8 hex  — vidéo ▶         │
│                                             │
│   [ Passer à Bornes+ ]                      │
└─────────────────────────────────────────────┘
```

- Stats de conquête + historique (**limité à 3 mois en gratuit**).
- Replays vidéo des runs (le moment signature, rejouable/partageable).
- Entrée vers **Bornes+** (premium) — mais **aucun paywall sur le jeu principal**.

## Le moment de fin de run (overlay plein écran)

Déclenché à l'arrêt du run, avant retour à la Map. Voir [03 §5](03-design-systeme-visuel.md).

```
┌─────────────────────────────────────────────┐
│         🎉  Run terminé !                   │
│                                             │
│     [ animation 3 s : vague de couleur ]    │
│                                             │
│   +12 hexagones   ·   5,4 km   ·   🔵 +2%   │
│                                             │
│        [ Partager en Story ]  [ Fermer ]    │
└─────────────────────────────────────────────┘
```

## Règles UI transverses

- Mode clair **et** sombre dès la V1.
- Chaque écran passe la **checklist screenshotable** ([03 §8](03-design-systeme-visuel.md)).
- Onboarding ultra court : *connexion → choix d'équipe → START*. Pas plus de 3 écrans avant le premier run.
