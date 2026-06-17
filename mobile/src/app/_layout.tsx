import {
  Archivo_700Bold, Archivo_800ExtraBold, Archivo_900Black, useFonts,
} from '@expo-google-fonts/archivo';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { getBackend } from '@/backend/GameBackend';
import { registerPushToken, scheduleSeasonEnd, scheduleStreakReminder } from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { useTerritoryStore } from '@/store/useTerritoryStore';
import { c } from '@/theme/tokens';

// Garde le splash natif affiché tant que les polices ne sont pas prêtes :
// évite un flash d'écran blanc au démarrage (perçu comme un long chargement).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const pseudo = useAppStore((s) => s.pseudo);
  const team = useAppStore((s) => s.team);
  const avatar = useAppStore((s) => s.avatar);
  const onboarded = useAppStore((s) => s.onboarded);
  const [fontsLoaded] = useFonts({ Archivo_700Bold, Archivo_800ExtraBold, Archivo_900Black });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Notifications (push + rappels locaux) une fois l'onboarding passé.
  useEffect(() => {
    if (!onboarded) return;
    (async () => {
      await registerPushToken().catch(() => null);
      await scheduleStreakReminder().catch(() => {});
      try {
        const season = await getBackend().getSeason();
        await scheduleSeasonEnd(season.endsAt);
      } catch {}
    })();
  }, [onboarded]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await getBackend().init({ pseudo, team, avatar });
      if (!alive) return;
      await useTerritoryStore.getState().hydrate();
      await useSeasonStore.getState().hydrateAndCheck();
    })();
    return () => {
      alive = false;
    };
  }, [pseudo, team, avatar]);

  // rollover au retour au premier plan + affichage du récap en attente
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') useSeasonStore.getState().checkRollover().catch(() => {});
    });
    const unsub = useSeasonStore.subscribe((s) => {
      if (s.pendingRecap && useAppStore.getState().onboarded) {
        router.push('/season-recap');
      }
    });
    return () => {
      sub.remove();
      unsub();
    };
  }, []);

  // Pas de vue intermédiaire : on laisse le splash natif visible jusqu'aux polices.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="team" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="summary" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="season-recap" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="feed" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="reward-qr" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="badge" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="avatar" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="legal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      {!splashDone && <AnimatedSplash onDone={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
}
