# 12 — Go-live : EAS, notifications push (iOS + Android), config Supabase

Ce guide liste **uniquement des étapes côté comptes** (Supabase dashboard, Expo/EAS,
Apple, Google) — tout le code est déjà en place. À dérouler dans l'ordre.

Projet Supabase : **RunningGame** (`dzdoyvznfqmhdvgujach`, région Paris).
Bundle id : `fr.bornes.app` (iOS et Android).

---

## 0. Pré-requis
- Node + `npm i -g eas-cli` (ou `npx eas-cli`).
- Comptes : **Expo**, **Apple Developer** (99 $/an, pour iOS), **Google Play Console**
  (25 $ une fois) + un projet **Firebase** (pour FCM Android).

---

## 1. Supabase — débloquer les écritures (5 min)
1. Dashboard → **Authentication → Sign In / Providers → Anonymous** → **Enable**.
   - Sans ça : lectures OK, mais run/duel/profil/amitié échouent (RLS).
2. Dashboard → **Edge Functions → `notify` → Secrets** → ajouter
   `NOTIFY_SECRET` = *(la valeur de `app_config.notify_secret`)*.
   - La récupérer : SQL Editor → `select value from app_config where key = 'notify_secret';`
   - Tant qu'absent : le push part quand même mais la fonction n'est pas authentifiée.

> Les clés client sont déjà dans `mobile/.env` (URL + clé publishable). En CI/EAS,
> reporter ces deux variables (`EXPO_PUBLIC_SUPABASE_URL`,
> `EXPO_PUBLIC_SUPABASE_ANON_KEY`) dans les *Environment variables* du projet EAS.

---

## 2. EAS — projet + projectId (5 min)
```bash
cd mobile
eas login
eas init            # crée/relie le projet → écrit extra.eas.projectId dans app.json
```
- **Important** : sans `projectId`, `registerPushToken()` renvoie `null`
  (les notifs **locales** marchent quand même, pas le **push**).
- Commit le `app.json` mis à jour (le `projectId` n'est pas secret).

---

## 3. Push — credentials (le cœur iOS + Android)
Le service **Expo Push** route vers APNs (iOS) et FCM (Android). Il faut donc
fournir les deux jeux de credentials une fois.

### iOS (APNs)
```bash
eas credentials -p ios
```
- Laisse EAS générer/gérer la **clé APNs** (`.p8`) — il la crée pour toi si tu es
  connecté au compte Apple Developer. Rien à coller manuellement côté code.
- L'entitlement `aps-environment` est ajouté automatiquement au build.

### Android (FCM v1)
1. Console **Firebase** → crée un projet → ajoute une app Android `fr.bornes.app`.
2. Récupère le fichier **service account** (Firebase → Paramètres → Comptes de
   service → *Générer une clé privée*).
3. Fournis-le à EAS :
   ```bash
   eas credentials -p android
   # → Google Service Account → FCM V1 → uploader le JSON
   ```

> Test rapide une fois un build installé : copie le token Expo affiché par l'app
> (ou lu dans `device_tokens`) et envoie un push de test via
> https://expo.dev/notifications.

---

## 4. Build & run (dev client)
Le push ne fonctionne **pas dans Expo Go** (SDK 53+) → il faut un *dev/standalone build*.
```bash
eas build --profile development --platform ios       # ou android
# installe le build, puis :
npx expo start --dev-client
```
- iOS simulateur : le profil `development` a `ios.simulator = true` (pas de push
  sur simulateur — tester le push sur **device réel**).
- Android : APK installable directement.

---

## 5. Production & soumission
```bash
eas build --profile production --platform all
```
Puis renseigne `eas.json → submit.production` (Apple ID, ascAppId, appleTeamId ;
chemin du service account Google) et :
```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```
Voir aussi `mobile/STORE_CHECKLIST.md`.

---

## 6. Récapitulatif des notifications branchées
**Push (serveur → Expo Push)** — déclenchés par triggers Postgres :
| Événement | Destinataire | Source |
|---|---|---|
| Duel lancé | le défié | trigger `on_duel_insert` |
| Duel terminé | les deux coureurs | trigger `on_duel_settle` |
| Drop ouvert | toute la ville | trigger `on_drop_open` |
| Territoire repris | anciens propriétaires | dans `score_run` |

**Locales (planifiées sur l'appareil)** — `mobile/src/lib/notifications.ts` :
série (quotidien 19 h), saison (J-1), duel (H-1), drop (H-1).

---

## 7. Checklist finale
- [ ] Auth anonyme activée
- [ ] `NOTIFY_SECRET` posé sur la fonction `notify`
- [ ] `eas init` (projectId dans app.json, commité)
- [ ] Credentials APNs (iOS) + FCM (Android) via `eas credentials`
- [ ] Variables `EXPO_PUBLIC_SUPABASE_*` dans l'environnement EAS
- [ ] Build dev installé sur device réel → push de test OK
- [ ] Builds production + soumission stores
- [ ] (Optionnel) token **Mapbox** pour la carte native
- [ ] `main` en branche par défaut sur GitHub
