// Config Mapbox partagée — token public, styles, et détection du SDK natif.
// Deux rendus possibles pour le même MapView :
//   · SDK natif @rnmapbox/maps (vecteur) — exige un dev build ET un token pk.*
//   · repli raster (RealBasemap) — tuiles Mapbox si token, sinon CARTO sans clé,
//     fonctionne partout (Expo Go, web).

import { NativeModules, TurboModuleRegistry } from 'react-native';

const RAW_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
/** token réellement utilisable (pas le placeholder `pk.xxxxx` du .env.default) */
export const MAPBOX_TOKEN =
  RAW_TOKEN.startsWith('pk.') && !RAW_TOKEN.includes('xxxxx') ? RAW_TOKEN : null;

// Styles au format `username/styleId` — surchargeables pour brancher les styles
// custom dessinés dans Mapbox Studio (backlog 0.2) sans toucher au code.
export const STYLE_DARK = process.env.EXPO_PUBLIC_MAPBOX_STYLE_DARK ?? 'mapbox/dark-v11';
export const STYLE_LIGHT = process.env.EXPO_PUBLIC_MAPBOX_STYLE_LIGHT ?? 'mapbox/light-v11';

/** URL de style pour le SDK natif. */
export const styleUrlFor = (dark: boolean) => `mapbox://styles/${dark ? STYLE_DARK : STYLE_LIGHT}`;

/** Attribution du repli raster (le SDK natif affiche la sienne nativement). */
export const BASEMAP_ATTRIBUTION = MAPBOX_TOKEN
  ? '© Mapbox © OpenStreetMap'
  : '© OpenStreetMap contributors © CARTO';

/** Le module natif @rnmapbox/maps est-il présent dans ce binaire ? */
export const nativeMapModuleAvailable = (() => {
  try {
    return (
      TurboModuleRegistry?.get?.('RNMBXModule') != null ||
      (NativeModules as Record<string, unknown>)?.RNMBXModule != null
    );
  } catch {
    return false;
  }
})();

/** Carte native utilisable : module natif présent ET token runtime posé. */
export const useNativeMap = nativeMapModuleAvailable && MAPBOX_TOKEN != null;
