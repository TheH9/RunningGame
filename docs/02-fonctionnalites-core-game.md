# 02 — Fonctionnalités (Core Game)

> ⚠️ Ce document décrit la **vision complète** des mécaniques. Le périmètre réellement construit en V1 est volontairement plus restreint — voir [08-roadmap-mvp](08-roadmap-mvp.md) et [10-backlog-v1](10-backlog-v1.md).

## A. Découpage territorial : conquête « Trail Paint » & rétention équilibrée

> ✅ **Décision** : on **peint sa trace** en courant ([ADR-002](decisions/ADR-002-trail-paint.md), qui affine [ADR-001](decisions/ADR-001-conquete-par-rue.md)). Le coureur est un **curseur lumineux** ; sa trace rejoint le **territoire de l'équipe** (heatmap en « veines »). Plus beau, plus intuitif, plus simple en MVP.

- **Geste = résultat :** tu cours → tu peins ta trace GPS, à ta couleur d'équipe (curseur = flèche directionnelle + traînée comète).
- **Affichage :** peinture directe de la trace (pas de map-matching nécessaire au rendu) + territoire d'équipe en veines douces.
- **Scoring (arrière-plan) :** la trace est agrégée en cellules ; une zone appartient à l'équipe au **score dominant**, % de contrôle par couverture.
- **Conflit :** pour reprendre une zone tenue, il faut y **repasser** (zone « contestée » en pointillés bicolores). Pas d'effacement brutal.
- **Décroissance lente :** une zone non revisitée **pâlit après 14 jours**, redevient **neutre après 30 jours**.

> 💡 **Différenciant :** la décroissance douce **valorise le coureur occasionnel** (effort = surface peinte, peu importe le niveau) et crée un rendez-vous régulier (rétention J14/J30).

## B. Système d'équipes à équilibrage dynamique

- **4 équipes par ville** : 🔴 Rouge, 🔵 Bleu, 🟡 Jaune, 🟢 Vert. Tout run individuel alimente le score du clan.
- **Anti-domination :** si une équipe dépasse **40 % de contrôle** d'une ville, un **bonus est proposé aux nouveaux inscrits** qui rejoignent l'équipe la plus faible.

> 💡 **Différenciant :** l'app est jouable et fun **dès ~50 utilisateurs** dans une ville, là où les autres paraissent vides au lancement.

> 🛠️ **Note V1 (simplicité) :** on garde 4 couleurs + carte + run + zones + classement quartier + 1 défi sponsorisé. **Pas** de monnaie virtuelle, coffre-fort, achievements complexes ou boutique cosmétique au départ.

## Feature B — Défi communautaire de quartier (esprit d'équipe)

- **Concept :** chaque mois, un **quartier réel** (délimité via OpenStreetMap) est sponsorisé par un partenaire (Kiprun, Distance, Salomon…).
- **Victoire :** l'équipe qui possède le plus grand **% du quartier au dernier jour du mois** qualifie ses membres.
- **Attribution :** lot (ex. 2 dossards pour les 20 km de Paris) **tiré au sort** parmi les joueurs de l'équipe gagnante ayant capturé ≥ 1 rue dans la zone — tirage en vidéo sur Instagram.

> 💡 **Différenciant :** la **performance pure ne garantit pas le gain**. Le coureur du dimanche a autant de chances que l'ultra-marathonien → engagement du cœur de cible + dynamiques de groupe réelles (on s'organise pour « sauver » son quartier).

## Feature C — Le « Drop » flash sur la map (chasse au trésor)

- **Concept :** notification push — *« Une paire de [Modèle] a été parachutée au Parc Monceau. »*
- **Un pin doré** type map-marker s'illumine sur la carte (Parc Monceau, etc.).

### ⚠️ Correction sécurité (importante)

Le **« premier arrivé gagne »** est dangereux (incite à courir vite, traverser sans regarder, prendre un vélo → blessure + triche). **On le remplace par une fenêtre de qualification :**

> *« Passe physiquement dans la zone entre 18 h et 21 h en session de run active pour être qualifié. »* → puis **tirage au sort** parmi les qualifiés.

On garde le frisson de la chasse au trésor, on réduit le risque physique et juridique, et c'est plus inclusif. Voir [07-securite-conformite](07-securite-conformite.md).

> 💡 **Différenciant :** l'arme anti-flemme du mardi soir sous la pluie — leviers psychologiques de Pokémon GO appliqués au running.

## Récapitulatif des mécaniques

| Mécanique | Rôle | Statut V1 |
|-----------|------|-----------|
| Trail Paint (curseur + trace peinte) | Cœur du jeu | ✅ Must |
| Scoring de territoire en arrière-plan (cellules) | Cœur du jeu | ✅ Must |
| Map-matching précis (rues exactes) | Précision/affichage | ⛔ V2 |
| 4 équipes / couleurs | Appartenance | ✅ Must |
| Classement quartier | Compétition | ✅ Must |
| Défi sponsorisé mensuel | Monétisation + lots | ✅ Must (1 seul type) |
| Drop (fenêtre + tirage) | Frisson + viralité | 🟡 Should |
| Décroissance 14/30 j | Rétention | 🟡 Should |
| Anti-domination / bonus | Équilibrage | 🟢 Could |
| Monnaie / cosmétiques | Engagement long terme | ⛔ Post-V1 |
