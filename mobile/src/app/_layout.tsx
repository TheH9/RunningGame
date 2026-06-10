import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getBackend } from '@/backend/GameBackend';
import { useAppStore } from '@/store/useAppStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { useTerritoryStore } from '@/store/useTerritoryStore';

export default function RootLayout() {
  const pseudo = useAppStore((s) => s.pseudo);
  const team = useAppStore((s) => s.team);

  useEffect(() => {
    let alive = true;
    (async () => {
      await getBackend().init({ pseudo, team });
      if (!alive) return;
      await useTerritoryStore.getState().hydrate();
      await useSeasonStore.getState().hydrateAndCheck();
    })();
    return () => {
      alive = false;
    };
  }, [pseudo, team]);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="team" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="summary" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="season-recap" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="feed" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="reward-qr" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
