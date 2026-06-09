// Moteur de run — tracking GPS (expo-location), distance/allure/peint en live,
// simplification Douglas-Peucker à l'arrêt, agrégation H3 pour l'aperçu.
// Le background tracking robuste (Transistor) arrive en lot 2-3 (dev build) ;
// expo-location suffit pour le MVP foreground + Expo Go.

import * as Location from 'expo-location';
import { create } from 'zustand';
import { trackDistance, simplify, type GeoPoint } from '../lib/geo';
import { trackToCells } from '../lib/territory';

export type RunStatus = 'idle' | 'running' | 'paused' | 'finished';

type RunSummary = {
  distanceM: number;
  paintedM: number;
  elapsedMs: number;
  points: GeoPoint[];
  cells: string[];
};

type RunState = {
  status: RunStatus;
  points: GeoPoint[];
  distanceM: number;
  elapsedMs: number;
  startedAt: number | null;
  pausedAccum: number;
  pausedAt: number | null;
  lastSummary: RunSummary | null;
  permissionDenied: boolean;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => RunSummary;
  tick: () => void;
};

let watcher: Location.LocationSubscription | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export const useRunStore = create<RunState>((set, get) => ({
  status: 'idle',
  points: [],
  distanceM: 0,
  elapsedMs: 0,
  startedAt: null,
  pausedAccum: 0,
  pausedAt: null,
  lastSummary: null,
  permissionDenied: false,

  start: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      set({ permissionDenied: true });
      return;
    }
    set({
      status: 'running',
      points: [],
      distanceM: 0,
      elapsedMs: 0,
      startedAt: Date.now(),
      pausedAccum: 0,
      pausedAt: null,
      permissionDenied: false,
    });
    watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const s = get();
        if (s.status !== 'running') return;
        const p: GeoPoint = {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          t: loc.timestamp,
          accuracy: loc.coords.accuracy ?? undefined,
        };
        // filtre précision : on ignore les fixes > 30 m (trace propre)
        if ((p.accuracy ?? 0) > 30) return;
        const pts = [...s.points, p];
        set({ points: pts, distanceM: trackDistance(pts) });
      },
    );
    timer = setInterval(() => get().tick(), 1000);
  },

  tick: () => {
    const s = get();
    if (s.status !== 'running' || !s.startedAt) return;
    set({ elapsedMs: Date.now() - s.startedAt - s.pausedAccum });
  },

  pause: () => {
    if (get().status !== 'running') return;
    set({ status: 'paused', pausedAt: Date.now() });
  },

  resume: () => {
    const s = get();
    if (s.status !== 'paused' || !s.pausedAt) return;
    set({ status: 'running', pausedAccum: s.pausedAccum + (Date.now() - s.pausedAt), pausedAt: null });
  },

  stop: () => {
    watcher?.remove();
    watcher = null;
    if (timer) clearInterval(timer);
    timer = null;
    const s = get();
    const simplified = simplify(s.points, 5);
    const summary: RunSummary = {
      distanceM: s.distanceM,
      // Privacy Zone à brancher au moment de l'auth (lot 6-7) : painted = total pour l'instant
      paintedM: s.distanceM,
      elapsedMs: s.elapsedMs,
      points: simplified,
      cells: trackToCells(simplified),
    };
    set({ status: 'finished', lastSummary: summary });
    return summary;
  },
}));
