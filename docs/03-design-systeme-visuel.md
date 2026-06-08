# 03 — Design & système visuel ⭐

> **C'est le document #1 du projet.** Le côté visuel n'est pas une finition : c'est l'arme de différenciation principale et le moteur viral. On ne gagne pas sur le tracking — on gagne parce que la carte est *belle, premium et screenshotable*.

## Principe directeur

> **« Chaque écran doit donner envie d'être capturé en screenshot et partagé en Story Instagram. »**

Trois mots d'ordre :
1. **Épuré** — refus des tableaux de bord austères des années 2010. Beaucoup d'espace, peu d'éléments.
2. **Pastel & lumineux** — territoires en couleurs pastel transparentes ; les moments forts (défis, drops) *brillent*.
3. **Instinctif** — le bouton START est massif. Zéro friction pour lancer un run.

---

## 1. Direction artistique

- **Style :** flat premium + soft gradients, coins très arrondis (radius 20-28 px), ombres douces diffuses.
- **Ambiance :** clair par défaut, mode sombre soigné (la carte de nuit est ultra « screenshotable »).
- **Référence d'âme :** la lisibilité d'Apple Maps + la joie colorée d'un jeu mobile premium + la sobriété d'une app fintech moderne.
- **Anti-pattern :** surcharge de data, graphiques austères, couleurs criardes saturées, UI « tableur ».

## 2. Palette — couleurs d'équipes (les 4 clans)

Ce sont les couleurs **signature** de la marque. Deux variantes par équipe : une **vive** (rues capturées, UI, accents, badges) et une **pastel transparente** (halo/fallback de zone sur la carte, ~35-45 % d'opacité).

| Équipe | Nom | Vive (HEX) | Pastel carte (HEX @ ~40%) |
|--------|-----|-----------|---------------------------|
| 🔴 Rouge | Les Braises | `#FF4D5E` | `#FFB3BA` |
| 🔵 Bleu | Les Vagues | `#3B82F6` | `#A9CBFF` |
| 🟡 Jaune | Les Soleils | `#FFC93C` | `#FFE6A1` |
| 🟢 Vert | Les Pousses | `#34D399` | `#A7E8C8` |

> Les noms d'équipes sont des propositions — à valider. Ils renforcent l'appartenance (« je suis une Braise »).

### Couleurs système

| Usage | HEX |
|-------|-----|
| Or / Drop (flash) | `#FFD54A` → halo `#FFB300` |
| Fond clair | `#F7F8FA` |
| Fond sombre | `#0E1116` |
| Texte principal (clair) | `#16181D` |
| Texte secondaire | `#6B7280` |
| Surface carte (clair) | base Mapbox monochrome désaturée |

## 3. Typographie

- **Display / titres :** une grotesque géométrique forte et arrondie (ex. *Clash Display*, *Satoshi*, *General Sans*). Personnalité + impact.
- **Texte / data :** une sans-serif neutre très lisible (ex. *Inter*). Chiffres tabulaires pour les stats.
- **Échelle :** Display 32/40, H1 24/28, H2 18/24, Body 15/22, Caption 12/16.

## 4. La carte (l'écran central — 80 % de l'effet « waouh »)

C'est l'objet le plus important de toute l'app.

- **Base :** style **Mapbox customisé**, monochrome désaturé (gris-bleu clair / sombre profond), routes fines, peu de POI, labels discrets. Le fond s'efface pour laisser les couleurs d'équipes briller.
- **Rues capturées ([ADR-001](decisions/ADR-001-conquete-par-rue.md)) :** style **heatmap façon Strava / CityStrides** — la rue parcourue devient une **ligne lumineuse continue** (halo + cœur vif + liseré clair) qui épouse le tracé réel. Pas de quadrillage. Parcs/berges : halo pastel de zone en fallback. Transitions animées douces à la capture.
- **Hiérarchie visuelle des états :**
  - *Neutre* — gris très clair, quasi transparent.
  - *Capturé* — pastel d'équipe.
  - *En décroissance* — pastel qui pâlit progressivement (J14→J30).
  - *Zone de défi* — liseré qui **respire** (pulse lent).
  - *Drop actif* — **pin doré** type map-marker qui flashe, halo lumineux.
- **Le bouton START :** gros bouton circulaire flottant, centré bas, couleur de l'équipe du joueur, légère pulsation au repos.

## 5. ⭐ Le moment signature : l'animation de fin de run

> **C'est notre moteur viral. À traiter avec un soin maniaque.**

À la fin de chaque run, l'app génère une **mini-animation vidéo de ~3 secondes** :
- La carte se centre sur le parcours.
- La **vague de couleur du joueur envahit** les rues capturées (effet « marée » fluide le long du parcours, easing soft).
- Overlay : distance, rues gagnées, % du quartier, logo Bornes discret.
- **Format vertical 9:16**, taillé exclusivement pour la **Story Instagram**.
- Bouton **« Partager »** immédiat + watermark élégant (acquisition organique).

Variantes à tester : compteur animé de rues, « avant/après » du quartier, classement d'équipe qui bascule.

## 6. Iconographie & motion

- **Icônes :** trait constant (stroke ~2 px), coins arrondis, set cohérent et minimal.
- **Motion :** tout est *fluide et doux* (easing `ease-out`, durées 200-400 ms). La capture d'une rue, l'apparition d'un drop, le passage d'onglet — chaque transition renforce le premium.
- **Haptique :** retour haptique léger à la capture d'une rue et au ramassage d'un drop (sensation de « collecte »).

## 7. Design tokens (référence implémentation)

Les valeurs ci-dessus sont la source de vérité du futur design system (Figma → tokens → code). À matérialiser dès le démarrage du build :

```
color.team.red.vivid     = #FF4D5E
color.team.red.map       = #FFB3BA
color.team.blue.vivid    = #3B82F6
color.team.blue.map      = #A9CBFF
color.team.yellow.vivid  = #FFC93C
color.team.yellow.map    = #FFE6A1
color.team.green.vivid   = #34D399
color.team.green.map     = #A7E8C8
color.drop.core          = #FFD54A
color.drop.halo          = #FFB300
radius.card              = 24
radius.pill              = 999
shadow.soft              = 0 8 24 rgba(16,24,40,0.08)
```

## 8. Checklist « screenshotable »

Avant de valider tout écran, se demander :
- [ ] Est-ce que je le posterais en Story sans retoucher ?
- [ ] La carte est-elle lisible *et* belle en un coup d'œil ?
- [ ] Y a-t-il un élément coloré « héros » qui attire l'œil ?
- [ ] Le watermark Bornes est-il présent mais discret ?
- [ ] Fonctionne en mode clair **et** sombre ?

## 9. Prochaines livrables visuels

1. **Moodboard** + exploration de logo/wordmark Bornes.
2. **Style Mapbox** custom (clair + sombre) — *priorité absolue*.
3. Maquettes haute-fidélité des **4 écrans** (Figma) — voir [04-ui-ecrans](04-ui-ecrans.md).
4. **Storyboard** de l'animation de fin de run (9:16).
5. Kit de **design tokens** exportable vers le code.

> 🎨 Outils disponibles dans cet environnement pour produire ces livrables : **Figma** (maquettes + design system), **Canva** / **Gamma** (moodboard, deck partenaires). Voir la note dans le plan racine.
