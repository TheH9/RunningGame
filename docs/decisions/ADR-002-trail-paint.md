# ADR-002 — Mécanique « Trail Paint » (curseur qui peint sa trace)

- **Statut :** ✅ Accepté
- **Date :** 2026-06-08
- **Validé sur maquettes** : `design/mockups/trail/` et `design/mockups/cursor/AB-final.png`
- **Affine / remplace** le volet *capture* de [ADR-001](ADR-001-conquete-par-rue.md).

## Contexte

ADR-001 actait la conquête « par rue » via **map-matching** (snap de la trace sur le graphe OSM). À la revue, deux problèmes : (1) le rendu « rues snappées » restait perfectible visuellement ; (2) le map-matching temps réel est lourd pour un MVP 8 semaines. Le fondateur a proposé un modèle plus intuitif : **un curseur-coureur qui peint sa trace derrière lui**. Un brainstorm de 3 agents (game design / UX carto / technique) a convergé vers ce modèle.

## Décision

**Le coureur est un curseur lumineux ; en courant il peint sa trace GPS, qui rejoint le territoire de son équipe.**

- **Visuel = peinture directe de la trace GPS** (pas de map-matching nécessaire pour l'affichage).
- **Double couche** :
  - *Trace du jour* — ligne vive « comète » (cœur bleu + tête blanc chaud) + **curseur = flèche directionnelle** (montre le sens de course) avec halo lumineux. (style A+B combiné)
  - *Territoire de l'équipe* — « veines » douces et floutées (heatmap collective persistante).
- **Scoring = en arrière-plan** (agrégation de la trace en cellules H3 ~25 m) : une zone appartient à l'équipe au score dominant ; **% de contrôle** par couverture. Découplé du rendu → l'UX n'est jamais bloquée.
- **Conflit** : les scores coexistent ; pour reprendre une zone tenue il faut y **repasser** (zone « contestée » affichée en pointillés bicolores). Pas d'effacement brutal.
- **Décroissance douce** : une zone non revisitée pâlit (rappel J14/J30).

## Justification
- **Fidèle à l'intuition produit** (curseur + trace).
- **Le plus beau** : effet heatmap Strava, coloré par équipe, ultra screenshotable (surtout en sombre).
- **Le plus simple en MVP** : on supprime le map-matching obligatoire ; on stocke/affiche une polyligne.
- **Juste pour l'occasionnel** : effort de course = surface peinte, indépendamment du niveau.

## Conséquences techniques (MVP)
- Pipeline : `GPS (client, simplifié Douglas-Peucker ~5 m) → batch upload → run_points → Realtime → rendu trace (Mapbox line layer)`. En parallèle : `worker async → cellules H3 → scores d'équipe`.
- **Anti-triche** : vitesse > 40 km/h invalidée, détection de trace « trop lisse » (fake GPS), horodatage **serveur** comme source de vérité, Privacy Zone 200 m.
- **Volume** : simplification client obligatoire + archivage des points anciens.
- **Map-matching précis** (rues exactes) → repoussé en **V2** (amélioration, non bloquant).

## Modèle de données (ajustement vs ADR-001/archi)
```
run_points     (id, session_id, geom POINT, recorded_at, accuracy_m)   -- la trace peinte
territory_cells(h3_index PK, team_id, last_seen, score, competition_id) -- scoring async
team_scores    (competition_id, team_id, coverage, updated_at)          -- vue matérialisée
```
> Les `streets`/`street_state` d'ADR-001 deviennent optionnels (réservés au map-matching V2 et au libellé « la Rue X est bleue »).

## Style visuel retenu
- Curseur : **flèche directionnelle** (sens de course) bleue, anneau blanc, halo.
- Trace : **comète** — cœur `#6aa6ff`, halo `#3B82F6` flou, tête **blanc chaud**, pointillés clairs.
- Territoire : veines team-colorées floutées (opacité selon ancienneté/intensité).
- HUD run : chrono, distance, allure, **« peint » (km/surface)**.
