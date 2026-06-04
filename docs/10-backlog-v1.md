# 10 — Backlog V1 (priorisation MoSCoW)

> Source du périmètre : [08-roadmap-mvp](08-roadmap-mvp.md). Priorisation : **Must** (V1) · **Should** (V1 si temps) · **Could** (post-V1) · **Won't** (hors-scope strict).

## Légende
`M` Must · `S` Should · `C` Could · `W` Won't (V1)

## Epic 0 — Design & système visuel ⭐ (priorité absolue, semaine 0)
| # | Story | Prio |
|---|-------|------|
| 0.1 | Moodboard + wordmark/logo Bornes | M |
| 0.2 | Style Mapbox custom clair **et** sombre | M |
| 0.3 | Maquettes hi-fi des 4 écrans (Figma) | M |
| 0.4 | Storyboard animation fin de run (9:16) | M |
| 0.5 | Design tokens exportables (couleurs équipes, radius, ombres) | M |
| 0.6 | Set d'icônes minimal cohérent | S |

## Epic 1 — Onboarding & compte
| # | Story | Prio |
|---|-------|------|
| 1.1 | En tant qu'utilisateur, je me connecte | M |
| 1.2 | Je choisis mon équipe (4 couleurs) | M |
| 1.3 | Consentement géoloc conforme CNIL | M |
| 1.4 | Bonus équipe la plus faible (anti-domination) | C |

## Epic 2 — Run & tracking
| # | Story | Prio |
|---|-------|------|
| 2.1 | Bouton START massif lance un run | M |
| 2.2 | Tracking GPS en background (Transistor SDK) | M |
| 2.3 | Mode session live (chrono, distance, rues capturées en temps réel) | M |
| 2.4 | Anti-triche : seuil 22 km/h + anti-téléportation | M |
| 2.5 | Privacy Zone 200 m (stats oui, capture publique non) | M |

## Epic 3 — Carte & territoire
| # | Story | Prio |
|---|-------|------|
| 3.1 | Carte Mapbox premium = écran d'accueil | M |
| 3.2 | Map-matching trace GPS → segments de rue (OSM) | M |
| 3.3 | Capture & rendu des rues colorées par équipe (+ fallback zones parcs) | M |
| 3.4 | États visuels (neutre / capturé / décroissance / défi / drop) | S |
| 3.5 | Décroissance 14 j (pâlit) / 30 j (neutre) | S |
| 3.6 | Maj temps réel de la carte | S |

## Epic 4 — Méta-jeu & classement
| # | Story | Prio |
|---|-------|------|
| 4.1 | Camembert de contrôle de la ville | M |
| 4.2 | Leaderboard du quartier du mois | M |
| 4.3 | Défi sponsorisé mensuel (1 type) | M |
| 4.4 | Drop (fenêtre temporelle + tirage au sort) | S |

## Epic 5 — Récompenses & Drive-to-Store
| # | Story | Prio |
|---|-------|------|
| 5.1 | Coffre-fort des lots gagnés | M |
| 5.2 | QR code unique/usage unique + retrait boutique | M |
| 5.3 | Règlement de jeu + conformité DGCCRF | M |
| 5.4 | Dashboard partenaire (scans, participation) | C |

## Epic 6 — Moment viral ⭐
| # | Story | Prio |
|---|-------|------|
| 6.1 | Animation fin de run (vague de couleur, 9:16) | M |
| 6.2 | Partage direct en Story Instagram + watermark | M |
| 6.3 | Replays des runs depuis le profil | S |

## Epic 7 — Profil
| # | Story | Prio |
|---|-------|------|
| 7.1 | Stats de conquête | M |
| 7.2 | Historique limité 3 mois (gratuit) | M |
| 7.3 | Mode sombre soigné | M |

## Epic 8 — Conformité & data
| # | Story | Prio |
|---|-------|------|
| 8.1 | Politique de confidentialité + CGU | M |
| 8.2 | Export / suppression des données (RGPD) | M |
| 8.3 | Anonymisation des données partenaires | M |

## Hors-scope strict V1 (`W`)
Apple Watch · Import GPX / API Strava · Chat / réseau social interne · Monnaie virtuelle & boutique cosmétique · Bornes+ (premium) · Offres clubs payantes · Multi-villes.

---

## Definition of Done (transverse)
- [ ] Conforme au système visuel ([03](03-design-systeme-visuel.md)) — passe la checklist screenshotable
- [ ] Fonctionne en mode clair **et** sombre
- [ ] Pas de régression sur le flux *connexion → équipe → START → run → capture → partage*
- [ ] Conforme RGPD/CNIL sur toute donnée de localisation
