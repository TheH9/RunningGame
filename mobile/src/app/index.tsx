import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  const team = useAppStore((s) => s.team);
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!team) return <Redirect href="/team" />;
  return <Redirect href="/(tabs)" />;
}
