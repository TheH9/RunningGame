# 08 — Roadmap & MVP

> **Ne pas construire toute la spec V1.2.** On construit une **V1 tranchante**, puis on enrichit. Le projet meurt s'il est trop large, trop complet, trop « app de sport ».

## Règles d'or du MVP

1. **MVP en 6-8 semaines maximum.**
2. **Une seule zone de lancement.**
3. **Un seul type de challenge sponsorisé.**
4. **Pas de premium au début.**
5. **Objectif = rétention J7/J30**, pas chiffre d'affaires.
6. **Premier argent = partenaires locaux**, pas utilisateurs.
7. **Différenciation centrale = vrais lots + quartiers réels + contenu social.**

## La V1 que l'on lance (périmètre exact)

1. Connexion utilisateur.
2. Choix d'équipe.
3. Bouton **Start Run**.
4. Tracking GPS (background).
5. Capture d'hexagones H3.
6. Carte Mapbox avec couleurs d'équipes.
7. Classement quartier.
8. Défi sponsorisé du mois (1 seul).
9. QR code si l'utilisateur gagne.
10. **Animation partageable de fin de run.** ⭐

**C'est tout.** Pas d'Apple Watch · pas de chat · pas d'import Strava/GPX · pas de réseau social interne · pas de boutique cosmétique · pas de monnaie virtuelle.

## Découpage en lots de build (~8 semaines)

| Semaine | Lot | Livrable |
|---------|-----|----------|
| 0 | **Design first** ⭐ | Style Mapbox custom (clair+sombre), maquettes hi-fi des 4 écrans, storyboard animation fin de run, design tokens |
| 1-2 | Fondations | Auth, choix d'équipe, modèle de données (Supabase/PostGIS), intégration Mapbox |
| 2-3 | Tracking & capture | SDK Background Geolocation, enregistrement run, conversion trace → H3, capture |
| 3-4 | Carte vivante | Rendu hexagones colorés, états (neutre/capturé/décroissance), temps réel |
| 4-5 | Méta-jeu | Classement quartier, camembert de contrôle, défi sponsorisé mensuel |
| 5-6 | Moment viral ⭐ | Animation de fin de run 9:16 + partage Story |
| 6-7 | Lots & conformité | QR codes, coffre-fort, Privacy Zone, anti-triche v1, RGPD/règlement |
| 7-8 | Polish & beta | Mode sombre, micro-interactions, haptique, tests terrain, durcissement |

> La **semaine 0 (design)** n'est pas optionnelle : le visuel est l'avantage concurrentiel. On ne code pas la carte avant que son style soit validé.

## Phases de lancement

### Phase 1 — Closed Beta
- **50-100 coureurs** de 2-3 clubs parisiens (ex. Distance, Kiprun).
- **Focus :** valider le SDK de tracking background en conditions réelles.

### Phase 2 — Open Beta (Paris Centre)
- Concentration **exclusive sur 2-3 arrondissements** pour saturer l'espace et créer de la friction immédiate (ex. 10e / 11e / 18e).
- **Premier événement Drop** avec un shop local.

### Phase 3 — Extension 92
- Ouverture de la grille H3 sur **Boulogne / Issy / Neuilly** une fois la rétention validée à Paris.

## Au-delà de la V1 (backlog stratégique)

Décroissance fine, anti-domination/bonus, drops récurrents, Bornes+, offres clubs, heatmap perso, multi-villes (playbook réplicable Lyon/Marseille/Londres).

## Métriques de succès

| Métrique | Cible bêta |
|----------|-----------|
| Densité | ~300 coureurs dans une zone resserrée |
| Rétention J7 | à instrumenter dès le jour 1 |
| Rétention J30 | objectif principal |
| Runs / utilisateur / semaine | ≥ 2 |
| Partage Story / run terminé | levier viral à mesurer |
| Partenaires signés | 3-5 |
