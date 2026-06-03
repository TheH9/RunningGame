# PLAN — Bornes (synthèse exécutable)

> Vue d'ensemble actionnable. Pour le détail, suivre les liens vers `docs/`.
> **Fil rouge non négociable : le visuel est l'arme #1.** Cf. [docs/03](docs/03-design-systeme-visuel.md).

## Le projet en 3 lignes
- **Quoi :** le Pokémon GO du running local — cours pour la couleur de ton équipe, capture des hexagones, gagne de **vrais lots** retirés en boutique.
- **Pour qui (V1) :** coureurs urbains occasionnels-réguliers, une seule micro-zone parisienne, 100-300 testeurs.
- **Comment on gagne :** B2B Drive-to-Store (défis/drops sponsorisés) + viralité de l'animation de fin de run.

## Les 5 décisions structurantes (déjà prises)
1. **Visuel = priorité produit**, pas finition (carte Mapbox premium + moment Instagram).
2. **V1 tranchante** (10 features, pas la spec V1.2 entière) — build 6-8 semaines.
3. **Lancement hyper-local** (une seule zone) pour garantir la densité.
4. **Pas de paywall** sur le jeu ; premier argent = partenaires locaux.
5. **Drop = fenêtre + tirage** (pas « premier arrivé »), pour la sécurité et la conformité.

## Plan d'action par phases

### ▶︎ Phase 0 — Design first (semaine 0) ⭐
- [ ] Moodboard + wordmark/logo
- [ ] Style Mapbox custom (clair + sombre)
- [ ] Maquettes hi-fi des 4 écrans
- [ ] Storyboard animation fin de run (9:16)
- [ ] Design tokens
> Outils dispo ici : **Figma** (maquettes/design system), **Canva/Gamma** (moodboard, deck partenaires).

### ▶︎ Phase 1 — Build MVP (semaines 1-8)
Suivre le découpage en lots de [docs/08](docs/08-roadmap-mvp.md#découpage-en-lots-de-build-8-semaines) et le backlog [docs/10](docs/10-backlog-v1.md).
Stack proposée : RN/Flutter + Mapbox + H3 + Transistor Background Geolocation + Supabase/PostGIS ([docs/05](docs/05-architecture-technique.md)).

### ▶︎ Phase 2 — Closed Beta (50-100 coureurs, 2-3 clubs)
- [ ] Valider le tracking background en réel
- [ ] Instrumenter rétention J7/J30

### ▶︎ Phase 3 — Open Beta (2-3 arrondissements)
- [ ] Saturer la zone
- [ ] 1er Drop avec un shop local
- [ ] Signer 3-5 micro-partenaires

### ▶︎ Phase 4 — Extension 92
- [ ] Ouvrir H3 sur Boulogne/Issy/Neuilly une fois la rétention validée

## Risques & parades
| Risque | Parade |
|--------|--------|
| Carte vide (densité) | Lancement mono-zone + clubs + feuilleton local ([09](docs/09-go-to-market.md)) |
| « Encore une app de sport » | Positionnement jeu + design premium ([01](docs/01-strategie-concurrence.md), [03](docs/03-design-systeme-visuel.md)) |
| Triche (vrais lots) | Anti-triche + tirage encadré ([07](docs/07-securite-conformite.md)) |
| Juridique (loterie/RGPD) | Règlement DGCCRF + consentement CNIL + Privacy Zone ([07](docs/07-securite-conformite.md)) |
| Sur-scope | V1 tranchante, hors-scope strict ([08](docs/08-roadmap-mvp.md)) |

## Prochaine action recommandée
**Lancer la Phase 0.** Décider d'abord : zone de lancement + nom/identité des 4 équipes → puis produire le style Mapbox et les maquettes. Je peux générer dès maintenant le moodboard, les maquettes Figma et un deck partenaires si tu veux.
