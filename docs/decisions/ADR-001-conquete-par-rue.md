# ADR-001 — Conquête par rue (et non par hexagones)

- **Statut :** ✅ Accepté
- **Date :** 2026-06-04
- **Décision validée sur maquette** (`design/mockups/out/map-streets.png`)

## Contexte

La V1.2 initiale prévoyait une conquête de territoire via une **grille Uber H3** (hexagones ~150 m). À la revue des maquettes, le quadrillage d'hexagones donnait un effet « plateau de jeu » qui recouvrait la carte et nuisait à l'exigence #1 du produit : une carte **premium, lisible et screenshotable**.

## Décision

Le territoire est conquis **rue par rue**. On court une rue → elle se colore à la couleur de l'équipe. L'unité de capture est le **segment de rue** issu du graphe **OpenStreetMap** (découpé aux intersections).

## Justification

- **Visuel premium** : les rues colorées s'intègrent à la carte au lieu de la recouvrir. Émotion forte : « *la Rue de Belleville est bleue* ».
- **Différenciation** : effet « screenshot Instagram » bien supérieur aux concurrents (Run An Empire, Turf) restés sur des grilles.
- **Référence éprouvée** : CityStrides, segments / Local Legends de Strava.

## Conséquences

### Techniques (à intégrer)
- **Map-matching** : coller la trace GPS bruitée sur le bon segment (moteurs : **Valhalla/Meili**, OSRM, GraphHopper). C'est la brique nouvelle vs H3 (qui était trivial).
- **Graphe de rues** : import OSM, découpage en segments, stockage `street_state(segment_id, team_id, …)`.
- **Score de contrôle** : par **longueur de rue** possédée (et non nombre de cellules).
- **Décroissance** : 14 j (pâlit) / 30 j (neutre) appliquée **au segment**.

### Règles de jeu
- **Capture partielle** : définir le seuil (ex. ≥ 70 % de la longueur du segment parcourue pour le capturer).
- **Fallback hors-rue** : parcs, berges, stades sans rue → **capture de zone** (contour OSM capturé en bloc), pour ne pas pénaliser ces parcours.

### Coûts / risques
- Surcoût de dev **moyen** (le moteur de map-matching et son réglage anti-bruit GPS).
- Risque : GPS qui saute entre deux rues parallèles → à mitiger via le matching + lissage.

## Alternatives écartées
- **Hexagones H3** : plus simple à coder, couvre tout le sol, mais effet visuel « plateau de jeu » jugé insuffisant pour la stratégie virale.
- **Hybride rue + zones partout** : envisageable plus tard ; en V1 on garde rue + fallback parcs uniquement.

## Impact documentaire
Met à jour : `02-fonctionnalites-core-game`, `03-design-systeme-visuel`, `04-ui-ecrans`, `05-architecture-technique`, `10-backlog-v1`, `README`, `PLAN`.
