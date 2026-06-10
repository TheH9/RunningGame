import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { getBackend } from '@/backend/GameBackend';
import { useAppStore } from '@/store/useAppStore';
import { useTerritoryStore } from '@/store/useTerritoryStore';

export default function RootLayout() {
  const pseudo = useAppStore((s) => s.pseudo);
  const team = useAppStore((s) => s.team);

  useEffect(() => {
    let alive = true;
    (async () => {
      await getBackend().init({ pseudo, team });
      if (alive) await useTerritoryStore.getState().hydrate();
    })();
    return () => {
      alive = false;
    };
  }, [pseudo, team]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="team" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="summary" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
