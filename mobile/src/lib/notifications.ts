// Notifications — push (Expo → APNs iOS / FCM Android) + rappels locaux.
// Le token est enregistré dans Supabase (device_tokens) ; la base envoie les
// push via l'edge function notify. Les rappels locaux (série, duel, drop,
// saison) sont planifiés côté appareil, sans serveur.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Affiche les notifs même quand l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Bornes',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#B8FF2E',
  });
}

/** Demande la permission, récupère le token Expo et l'enregistre dans Supabase. */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // pas de push sur simulateur

  await ensureAndroidChannel();

  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
  if (!projectId) return null; // EAS pas encore configuré → pas de token push

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }

  const { data: { session } } = await supabase!.auth.getSession();
  const userId = session?.user?.id;
  if (supabase && userId) {
    await supabase.from('device_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
  }
  return token;
}

// --- Rappels locaux ---------------------------------------------------------

const ID = {
  streak: 'local-streak',
  season: 'local-season-end',
  duel: (id: string) => `local-duel-${id}`,
  drop: (id: string) => `local-drop-${id}`,
};

/** Rappel quotidien pour entretenir la série (par défaut 19 h). */
export async function scheduleStreakReminder(hour = 19, minute = 0): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID.streak).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID.streak,
    content: { title: '🔥 Garde ta série', body: 'Un run aujourd’hui pour ne pas casser ta série !' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

/** Rappel la veille de la fin de saison (carte remise à zéro). */
export async function scheduleSeasonEnd(endsAtMs: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID.season).catch(() => {});
  const when = endsAtMs - 24 * 3600 * 1000;
  if (when <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: ID.season,
    content: { title: '🏁 Dernier jour de saison', body: 'La carte se remet à zéro demain — défends ton territoire !' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when) },
  });
}

/** Rappel 1 h avant la fin d'un duel. */
export async function scheduleDuelEnd(duelId: string, endsAtMs: number): Promise<void> {
  const when = endsAtMs - 3600 * 1000;
  if (when <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: ID.duel(duelId),
    content: { title: '⚔️ Duel bientôt fini', body: 'Plus qu’une heure pour prendre l’avantage !' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when) },
  });
}

/** Rappel 1 h avant la fermeture d'un drop. */
export async function scheduleDropEnd(dropId: string, endsAtMs: number): Promise<void> {
  const when = endsAtMs - 3600 * 1000;
  if (when <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: ID.drop(dropId),
    content: { title: '🎁 Drop bientôt clos', body: 'Dernière heure pour réclamer ton lot !' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when) },
  });
}
