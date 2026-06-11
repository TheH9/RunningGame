// Localisation ponctuelle — ancre le monde sur la vraie position à l'ouverture
// de la carte (la « vraie carte » montre chez toi sans attendre le 1er run).
// Foreground uniquement, jamais de suivi : un fix + un reverse-geocode.
// Sur le web on s'abstient (prompt navigateur intrusif, le replay démo suffit).

import { Platform } from 'react-native';
import type { LatLon } from './world';

export async function locateOnce(): Promise<LatLon | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: fix.coords.latitude, lon: fix.coords.longitude };
  } catch {
    return null;
  }
}

/** Nom de la ville (geocoder natif, sans clé) — null si indisponible. */
export async function cityNameFor(p: LatLon): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Location = await import('expo-location');
    const res = await Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lon });
    return res[0]?.city ?? res[0]?.subregion ?? null;
  } catch {
    return null;
  }
}
