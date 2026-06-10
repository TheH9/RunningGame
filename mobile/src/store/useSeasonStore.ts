// Saisons — la carte redevient vierge toutes les 6 semaines.
// `endsAt` est un epoch absolu ; le rollover est vérifié au lancement, au
// retour au premier plan et à la fin d'un run. Boucle while → gère les
// saisons manquées (un seul récap, le plus récent).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getBackend } from '../backend/GameBackend';
import type { SeasonInfo, SeasonRecap } from '../backend/types';
import { useAppStore } from './useAppStore';
import { useTerritoryStore } from './useTerritoryStore';

const SEASON_MS = 42 * 24 * 3600 * 1000;

function nextSeason(prev: SeasonInfo): SeasonInfo {
  return { number: prev.number + 1, startsAt: prev.endsAt, endsAt: prev.endsAt + SEASON_MS, durationDays: 42 };
}

// mode debug web : ?debugSeasonEnd=1 force la fin de saison.
// Lu AU CHARGEMENT DU MODULE — expo-router réécrit l'URL ensuite.
const DEBUG_FORCE_END = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    return window.location.search.includes('debugSeasonEnd');
  } catch {
    return false;
  }
})();

function debugForceEnd(): boolean {
  return DEBUG_FORCE_END;
}

type SeasonState = {
  current: SeasonInfo | null;
  hallOfFame: SeasonRecap[];
  pendingRecap: SeasonRecap | null;
  rolling: boolean;
  hydrateAndCheck: () => Promise<void>;
  checkRollover: () => Promise<void>;
  acknowledgeRecap: () => void;
  daysLeft: () => number;
};

export const useSeasonStore = create<SeasonState>()(
  persist(
    (set, get) => ({
      current: null,
      hallOfFame: [],
      pendingRecap: null,
      rolling: false,

      hydrateAndCheck: async () => {
        if (!get().current) {
          const s = await getBackend().getSeason();
          set({ current: s });
        }
        if (debugForceEnd() && get().current && get().current!.endsAt > Date.now()) {
          set({ current: { ...get().current!, endsAt: Date.now() - 1000 } });
        }
        await get().checkRollover();
      },

      checkRollover: async () => {
        const state = get();
        if (state.rolling || !state.current) return;
        if (Date.now() <= state.current.endsAt) return;
        set({ rolling: true });
        try {
          let season = state.current;
          let lastRecap: SeasonRecap | null = null;
          const hall = [...state.hallOfFame];
          while (Date.now() > season.endsAt) {
            // photographie de la saison qui se termine
            const boards = await getBackend().getLeaderboards();
            const app = useAppStore.getState();
            const meIdx = boards.runners.findIndex((r) => r.isMe);
            const recap: SeasonRecap = {
              season,
              podium: boards.teams,
              champion: boards.runners[0]
                ? { pseudo: boards.runners[0].pseudo, team: boards.runners[0].team, paintedKm: boards.runners[0].paintedKm }
                : { pseudo: '—', team: 'vagues', paintedKm: 0 },
              me: {
                paintedKm: app.seasonPaintedM / 1000,
                cellsTaken: 0,
                rank: meIdx >= 0 ? meIdx + 1 : boards.runners.length,
                runs: app.totalRuns,
              },
            };
            hall.unshift(recap);
            lastRecap = recap;
            // remise à zéro
            const next = nextSeason(season);
            await getBackend().resetSeason(next);
            useAppStore.getState().resetSeasonStats();
            season = next;
          }
          await useTerritoryStore.getState().resetForSeason();
          set({ current: season, hallOfFame: hall.slice(0, 12), pendingRecap: lastRecap });
        } finally {
          set({ rolling: false });
        }
      },

      acknowledgeRecap: () => set({ pendingRecap: null }),

      daysLeft: () => {
        const c = get().current;
        if (!c) return 0;
        return Math.max(0, Math.ceil((c.endsAt - Date.now()) / (24 * 3600 * 1000)));
      },
    }),
    {
      name: 'bornes-season',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ current: s.current, hallOfFame: s.hallOfFame, pendingRecap: s.pendingRecap }) as SeasonState,
    },
  ),
);
