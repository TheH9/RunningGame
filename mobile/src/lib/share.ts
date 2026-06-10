// Partage de la story de fin de run. Dégrade proprement si les modules
// natifs ne sont pas dispo (ex. Expo Go web) : on ne casse jamais l'UX.

import type { RefObject } from 'react';
import type { View } from 'react-native';

export async function shareRunCard(ref: RefObject<View | null>): Promise<'shared' | 'unavailable' | 'error'> {
  try {
    const { captureRef } = await import('react-native-view-shot');
    const Sharing = await import('expo-sharing');
    if (!ref.current) return 'error';
    const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager ma trace Bornes' });
    return 'shared';
  } catch {
    return 'error';
  }
}
