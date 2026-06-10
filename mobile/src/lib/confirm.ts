// Confirmation multiplateforme — Alert.alert est un no-op sur react-native-web.

import { Alert, Platform } from 'react-native';

export function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}
