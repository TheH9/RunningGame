import { Redirect } from 'expo-router';
import { isOnline } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  const team = useAppStore((s) => s.team);
  const ready = useAuthStore((s) => s.ready);
  const session = useAuthStore((s) => s.session);

  // En ligne (Supabase configuré), un compte est obligatoire avant de jouer.
  // En mode démo (sans clés), on saute l'auth.
  if (isOnline()) {
    if (!ready) return null; // attend la première lecture de session (splash visible)
    if (!session) return <Redirect href="/auth" />;
  }

  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!team) return <Redirect href="/team" />;
  return <Redirect href="/(tabs)" />;
}
