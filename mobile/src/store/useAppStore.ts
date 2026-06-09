// État global persistant : profil local + équipe (définitive pour la saison).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TeamSlug } from '../theme/tokens';

type AppState = {
  pseudo: string | null;
  team: TeamSlug | null;
  onboarded: boolean;
  /** cellules H3 uniques jamais visitées (stat « % découvert », ADR-003) */
  discoveredCells: string[];
  totalRuns: number;
  totalDistanceM: number;
  totalPaintedM: number;
  setPseudo: (p: string) => void;
  chooseTeam: (t: TeamSlug) => void;
  completeOnboarding: () => void;
  recordRun: (distanceM: number, paintedM: number, cells: string[]) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      pseudo: null,
      team: null,
      onboarded: false,
      discoveredCells: [],
      totalRuns: 0,
      totalDistanceM: 0,
      totalPaintedM: 0,
      setPseudo: (pseudo) => set({ pseudo }),
      chooseTeam: (team) => set({ team }),
      completeOnboarding: () => set({ onboarded: true }),
      recordRun: (distanceM, paintedM, cells) => {
        const merged = new Set(get().discoveredCells);
        for (const c of cells) merged.add(c);
        set({
          totalRuns: get().totalRuns + 1,
          totalDistanceM: get().totalDistanceM + distanceM,
          totalPaintedM: get().totalPaintedM + paintedM,
          discoveredCells: [...merged],
        });
      },
    }),
    { name: 'bornes-app', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
