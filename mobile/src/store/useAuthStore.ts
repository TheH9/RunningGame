// Session d'authentification — suit l'état Supabase (connecté / déconnecté).
// `ready` passe à true après la première lecture de session (évite un flash
// de l'écran d'auth au démarrage si une session existe déjà).

import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

type AuthState = {
  session: Session | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  ready: false,
  signOut: async () => {
    await supabase?.auth.signOut();
  },
}));

// Initialisation : session courante + abonnement aux changements.
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, ready: true });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, ready: true });
  });
} else {
  // Mode démo (sans clés Supabase) : pas d'auth requise.
  useAuthStore.setState({ ready: true });
}
