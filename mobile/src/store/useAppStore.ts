// État global persistant : profil local, équipe (définitive pour la saison),
// ancrage du monde, privacy zone, stats cumulées.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LatLon } from '../lib/world';
import type { AvatarConfig } from '../lib/avatar';
import type { TeamSlug } from '../theme/tokens';

export type PrivacyZone = { center: LatLon; radiusM: number };
export type BestRun = { distanceM: number; paceMinKm: number } | null;

type AppState = {
  pseudo: string | null;
  team: TeamSlug | null;
  /** avatar personnalisé (DiceBear) — partagé via le profil Supabase */
  avatar: AvatarConfig | null;
  onboarded: boolean;
  tutorialSeen: boolean;
  /** ancrage lat/lon du monde — posé à l'ouverture de la carte ou au 1er fix GPS */
  worldAnchor: LatLon | null;
  /** ville réelle (reverse-geocode de l'ancre) — affichage uniquement */
  cityName: string | null;
  privacyZone: PrivacyZone | null;
  /** cellules H3 uniques jamais visitées (stat « % découvert », ADR-003) */
  discoveredCells: string[];
  totalRuns: number;
  totalDistanceM: number;
  totalPaintedM: number;
  /** km peints sur la saison en cours (défi sponsor) */
  seasonPaintedM: number;
  bestRun: BestRun;
  setPseudo: (p: string) => void;
  setAvatar: (a: AvatarConfig) => void;
  chooseTeam: (t: TeamSlug) => void;
  completeOnboarding: () => void;
  markTutorialSeen: () => void;
  setWorldAnchor: (a: LatLon) => void;
  setCityName: (n: string | null) => void;
  setPrivacyZone: (z: PrivacyZone | null) => void;
  recordRun: (distanceM: number, paintedM: number, cells: string[], elapsedMs: number) => void;
  resetSeasonStats: () => void;
  resetAll: () => void;
};

const initial = {
  pseudo: null,
  team: null,
  avatar: null as AvatarConfig | null,
  onboarded: false,
  tutorialSeen: false,
  worldAnchor: null,
  cityName: null,
  privacyZone: null,
  discoveredCells: [] as string[],
  totalRuns: 0,
  totalDistanceM: 0,
  totalPaintedM: 0,
  seasonPaintedM: 0,
  bestRun: null as BestRun,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,
      setPseudo: (pseudo) => set({ pseudo }),
      setAvatar: (avatar) => set({ avatar }),
      chooseTeam: (team) => set({ team }),
      completeOnboarding: () => set({ onboarded: true }),
      markTutorialSeen: () => set({ tutorialSeen: true }),
      setWorldAnchor: (worldAnchor) => set({ worldAnchor }),
      setCityName: (cityName) => set({ cityName }),
      setPrivacyZone: (privacyZone) => set({ privacyZone }),
      recordRun: (distanceM, paintedM, cells, elapsedMs) => {
        const merged = new Set(get().discoveredCells);
        for (const c of cells) merged.add(c);
        const paceMinKm = distanceM > 100 ? elapsedMs / 60000 / (distanceM / 1000) : Infinity;
        const prev = get().bestRun;
        const bestRun =
          distanceM > 1000 && (!prev || paceMinKm < prev.paceMinKm)
            ? { distanceM, paceMinKm }
            : prev;
        set({
          totalRuns: get().totalRuns + 1,
          totalDistanceM: get().totalDistanceM + distanceM,
          totalPaintedM: get().totalPaintedM + paintedM,
          seasonPaintedM: get().seasonPaintedM + paintedM,
          discoveredCells: [...merged],
          bestRun,
        });
      },
      resetSeasonStats: () => set({ seasonPaintedM: 0 }),
      resetAll: () => set({ ...initial }),
    }),
    { name: 'bornes-app', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Nom de ville à afficher (vraie ville localisée, sinon ville de lancement). */
export function useCityName(): string {
  return useAppStore((s) => s.cityName) ?? 'Asnières';
}
