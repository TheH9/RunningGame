# 07 — Sécurité, anti-triche & conformité

> De **vrais lots à forte valeur (150 €+)** sont en jeu. La crédibilité des lots = la crédibilité de la marque. La sécurité doit être drastique là où Strava ferme les yeux sur la triche.

## 1. Algorithme anti-triche

- **Analyse de la trace GPS en fin de run** (pas en live, pour préserver la batterie).
- **Seuil vélo/trottinette :** si la vitesse moyenne sur un tronçon dépasse **22 km/h**, le run est **bloqué** pour suspicion.
- **Téléportation (Fake GPS) :** sauts impossibles → **rejet immédiat** du run.
- À étoffer : cohérence accéléromètre/pas, plausibilité d'allure, scoring de confiance plutôt que blocage binaire (réduire les faux positifs).

## 2. Privacy Zone (floutage vie privée) 🔒

- **Zone d'exclusion de 200 m** autour du domicile / bureau de l'utilisateur.
- Le run y est **compté pour ses stats**, mais **aucune rue n'est capturée publiquement** dans cette zone.

> 💡 **Différenciant :** on protège contre le harcèlement — impossible de savoir où habite le joueur qui a pris ton territoire. C'est un point noir récurrent des autres apps géolocalisées. **À garder dès la V1.**

## 3. Conformité jeux-concours (DGCCRF) ⚖️

Les loteries publicitaires sont réglementées en France. La DGCCRF rappelle qu'elles doivent être **gratuites** (des opérations avec obligation d'achat existent sous conditions strictes).

**Pour chaque défi / drop, prévoir :**
- [ ] **Règlement de jeu** clair et accessible.
- [ ] Conditions de participation explicites.
- [ ] Valeur des lots annoncée.
- [ ] Durée de l'opération.
- [ ] Méthode d'attribution (tirage au sort encadré, traçable).
- [ ] **Pas d'achat obligatoire** pour participer.
- [ ] Conformité RGPD.

> Le retrait du lot en boutique (scan QR) est une **modalité de remise**, pas une condition d'achat — à formuler proprement dans le règlement.

## 4. RGPD / CNIL — données de géolocalisation 📍

On manipule des **données de localisation très sensibles**. La CNIL impose le **consentement** pour les traitements non nécessaires (notamment publicitaires) et exige que **les permissions soient justifiées**.

**À implémenter dès la V1 :**
- [ ] Consentement clair et granulaire (tracking, usage, partage partenaires).
- [ ] Demande de permission de localisation **justifiée** dans l'UX (pourquoi le background).
- [ ] Minimisation : ne stocker que ce qui est nécessaire.
- [ ] Privacy Zone (déjà couverte ci-dessus).
- [ ] Droit d'accès / suppression des données (export + delete).
- [ ] Politique de confidentialité + CGU dès le lancement bêta.
- [ ] Anonymisation/agrégation des données vendues/montrées aux partenaires (jamais de traces individuelles).

## 5. Sécurité des lots (anti-fraude récompenses)

- QR code **unique, à usage unique**, lié au joueur et expirant.
- Validation côté serveur au scan en boutique (statut `prizes_won`).
- Journal d'attribution (tirage) **auditable** pour la transparence (tirage filmé Instagram = preuve sociale).

## Checklist conformité avant lancement bêta

- [ ] Politique de confidentialité + CGU rédigées
- [ ] Règlement de jeu type (défi & drop)
- [ ] Bandeau consentement géoloc conforme CNIL
- [ ] Privacy Zone fonctionnelle
- [ ] Anti-triche v1 (22 km/h + anti-teleport)
- [ ] Process de remise lot + QR sécurisé
