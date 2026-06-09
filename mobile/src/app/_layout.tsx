import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
