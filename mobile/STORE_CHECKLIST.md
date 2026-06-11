# Checklist de publication — App Store & Play Store

## ✅ Fait dans le code / la config

### Identité & build
- [x] `ios.bundleIdentifier` + `android.package` = `fr.bornes.app`
- [x] `version` 1.0.0, `ios.buildNumber` 1, `android.versionCode` 1
- [x] `eas.json` (profils development / preview / production, `autoIncrement`)
- [x] `runtimeVersion` (policy `appVersion`) pour EAS Update
- [x] Orientation portrait verrouillée
- [x] `userInterfaceStyle: dark` (app dark-first → pas de rendu light cassé)
- [x] Splash écran sur fond sombre (`#0A0B0F`) → plus de flash bleu au lancement

### Permissions (point de rejet n°1)
- [x] Localisation **When-In-Use uniquement** (texte d'usage clair, FR)
- [x] **Arrière-plan retiré** : la clé `NSLocationAlwaysAndWhenInUse…` et
      `ACCESS_BACKGROUND_LOCATION` sont supprimées/bloquées (déclarer un usage
      non utilisé = rejet Apple/Google garanti)
- [x] Refus de permission géré proprement (écran dédié → réglages système)

### Confidentialité (obligatoire pour la localisation)
- [x] **Privacy Manifest iOS** (`NSPrivacyAccessedAPITypes` UserDefaults
      `CA92.1` + `NSPrivacyCollectedDataTypes` localisation, non liée, non
      tracking) → évite l'e-mail ITMS-91053
- [x] `ITSAppUsesNonExemptEncryption: false` → plus d'invite export à chaque build
- [x] Écran **Confidentialité in-app** (`/legal`) + lien depuis Réglages
- [x] **Suppression des données** : Réglages → « Effacer toutes mes données »
      (vide AsyncStorage) → exigence Apple 5.1.1(v) & Google Data deletion
- [x] `PRIVACY.md` prêt à héberger (URL à mettre dans les deux consoles)

### Accessibilité / UX
- [x] `accessibilityRole`/`Label`/`Hint` sur les boutons (GO, STOP, etc.)
- [x] Safe areas gérées (`react-native-safe-area-context`)
- [x] Cibles tactiles ≥ 44 px sur les contrôles principaux

## ⛔ À faire manuellement (hors code)

### EAS / comptes
- [ ] `eas init` (génère `extra.eas.projectId`) puis `eas build -p ios|android --profile production`
- [ ] Renseigner `eas.json > submit.production` (Apple ID, ascAppId, teamId ;
      `google-service-account.json`)
- [ ] Compte Apple Developer (99 $/an) + App Store Connect ; compte Google
      Play (25 $ une fois)

### Fiches store
- [ ] Héberger `PRIVACY.md` → coller l'URL (App Privacy + Play Data safety)
- [ ] Remplir **App Privacy** (Apple) / **Data safety** (Google) :
      Localisation précise, *App functionality*, **non liée à l'identité**,
      **pas de tracking**
- [ ] Captures d'écran (6.7" + 6.5" iPhone, 7"/10" si tablette ; Android phone)
- [ ] Description, mots-clés, catégorie (Santé & remise en forme / Sport)
- [ ] Classification d'âge (questionnaire) — viser 4+/PEGI 3
- [ ] Icône 1024×1024 (déjà : `assets/images/icon.png`) — sans coins arrondis ni alpha
- [ ] URL de support + e-mail de contact

### Tests pré-soumission
- [ ] Build interne (TestFlight / Internal testing) sur **device réel**
- [ ] Run GPS réel en extérieur (le seul cas non simulable)
- [ ] Vérifier le rapport de pré-lancement Play (accessibilité, crash)
