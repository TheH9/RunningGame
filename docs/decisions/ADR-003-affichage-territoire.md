# ADR-003 — Affichage du territoire : veines de près, hexagones de loin

- **Statut :** ✅ Accepté
- **Date :** 2026-06-09
- **Validé sur maquettes** : `design/mockups/map-styles/` (comparatif 4 styles)
- **Complète** [ADR-002 Trail Paint](ADR-002-trail-paint.md) (mécanique) en figeant la **représentation cartographique**.

## Contexte

Question ouverte : comment montrer le territoire sur la map ? Quatre options maquettées et comparées sur la même carte : **fog of war** (la ville sous brume, révélée en courant), **hexagones** le long des rues, **veines** (trace peinte, style actuel), **aquarelle** de quartiers.

| Option | Simple | Ludique | Esthétique | Rejet / rétention |
|---|---|---|---|---|
| Fog of war | ⚠️ masque + perf | ⭐⭐⭐ exploration | ⭐⭐ | ❌ cache la bataille des équipes (cœur du jeu) |
| Hexagones | ✅ (scoring déjà en H3) | ⭐⭐⭐ plateau lisible | ⭐⭐ | ⚠️ grille « posée sur » la ville, look générique seul |
| Veines | ✅ le plus simple | ⭐⭐ | ⭐⭐⭐ | ⚠️ dense au dézoom max |
| Aquarelle | ✅ | ⭐ | ⭐⭐ | ❌ flou, aucune lecture tactique |

## Décision

**Affichage à deux niveaux de zoom (LOD), + fog en stat perso :**

1. **Zoom rue / pendant le run → VEINES** : les rues courues s'illuminent à la couleur d'équipe ; la ville elle-même est le plateau. Trace du jour en comète + curseur flèche (ADR-002).
2. **Dézoom ville → HEXAGONES doux** : les veines s'agrègent en cellules hex team-colorées (opacité = force de contrôle). Score lisible d'un coup d'œil, façon plateau de jeu. *Coût quasi nul : le scoring backend est déjà en cellules H3 — l'affichage hex est une visualisation directe de `territory_cells`.*
3. **Fog of war → stat personnelle**, pas une couche de map : « tu as découvert X % d'Asnières » dans le profil (+ éventuel mode exploration en V2). En couche principale il masquerait les équipes adverses.
4. **Aquarelle → écartée** (jolie de loin, inutile tactiquement).

> Résumé produit : **« de près tu peins des rues, de loin tu vois un plateau d'hexagones. »**

## Conséquences
- Client : bascule de couche selon le niveau de zoom Mapbox (~z14 : veines ; en-dessous : hexagones H3 agrégés). Transition en fondu.
- Backend : rien de nouveau — `territory_cells` (H3) sert à la fois le scoring et l'affichage dézoomé.
- Profil : nouvelle stat « % du quartier découvert » (cellules uniques visitées / cellules du quartier).
- Au dézoom, l'agrégation hex résout naturellement la densité des veines (le risque identifié en ADR-002).
