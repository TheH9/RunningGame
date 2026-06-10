// Moteur de run — source de position interchangeable (GPS réel ou replay démo),
// segments publics (coupés sur perte de signal), auto-pause GPS, anti-triche
// vitesse, snapshot de récupération. Le rendu et les événements (RunDirector)
// s'abonnent à ce store ; lui ne connaît ni la carte ni l'UI.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { haversine, simplify, trackDistance, type GeoPoint } from '../lib/geo';
import { GpsSource, ReplaySource, type LocationSource } from '../lib/locationSource';
import { trackToCells } from '../lib/territory';
import { getWorld, makeRng } from '../lib/world';
import { useAppStore } from './useAppStore';

export type RunStatus = 'idle' | 'running' | 'paused' | 'finished';

export type RunSummary = {
  distanceM: number;
  paintedM: number;
  elapsedMs: number;
  startedAt: number;
  /** trace à plat simplifiée (affichage story) */
  points: GeoPoint[];
  /** segments publics simplifiés (soumission territoire) */
  segments: GeoPoint[][];
  cells: string[];
  tooShort: boolean;
  /** vitesse soutenue > 40 km/h : non soumis au territoire */
  invalidated: boolean;
  mode: 'gps' | 'replay';
};

const SNAPSHOT_KEY = 'bornes-run-snapshot';
const GAP_NEW_SEGMENT_M = 100;
const AUTO_PAUSE_AFTER_MS = 15000;
const FAST_KMH = 25;
const INVALID_KMH = 40;

type RunState = {
  status: RunStatus;
  mode: 'gps' | 'replay';
  /** segments bruts ; le dernier est le segment actif */
  segments: GeoPoint[][];
  /** nb total de points (sélecteur léger pour le rendu de trace) */
  pointCount: number;
  distanceM: number;
  flaggedM: number;
  elapsedMs: number;
  startedAt: number | null;
  pausedAccum: number;
  pausedAt: number | null;
  autoPaused: boolean;
  tooFastNow: boolean;
  invalidated: boolean;
  permissionDenied: boolean;
  lastSummary: RunSummary | null;
  /** dernier point accepté (pour caméra/curseur) */
  lastPoint: GeoPoint | null;
  start: (opts?: { replay?: boolean }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => RunSummary;
  discard: () => void;
  tick: () => void;
};

let source: LocationSource | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let lastFixAt = 0;
let invalidWindowStart = 0;
// fenêtre glissante (30 s) pour la vitesse soutenue
let speedWindow: { t: number; v: number }[] = [];

function allPoints(segments: GeoPoint[][]): GeoPoint[] {
  return segments.flat();
}

export const useRunStore = create<RunState>((set, get) => ({
  status: 'idle',
  mode: 'gps',
  segments: [],
  pointCount: 0,
  distanceM: 0,
  flaggedM: 0,
  elapsedMs: 0,
  startedAt: null,
  pausedAccum: 0,
  pausedAt: null,
  autoPaused: false,
  tooFastNow: false,
  invalidated: false,
  permissionDenied: false,
  lastSummary: null,
  lastPoint: null,

  start: async (opts) => {
    if (get().status === 'running' || get().status === 'paused') return;
    const wantReplay = opts?.replay ?? Platform.OS === 'web';

    set({
      status: 'running',
      mode: wantReplay ? 'replay' : 'gps',
      segments: [[]],
      pointCount: 0,
      distanceM: 0,
      flaggedM: 0,
      elapsedMs: 0,
      startedAt: Date.now(),
      pausedAccum: 0,
      pausedAt: null,
      autoPaused: false,
      tooFastNow: false,
      invalidated: false,
      permissionDenied: false,
      lastPoint: null,
    });
    lastFixAt = Date.now();
    invalidWindowStart = 0;
    speedWindow = [];

    if (wantReplay) {
      const anchor = useAppStore.getState().worldAnchor ?? undefined;
      const world = getWorld(anchor ?? undefined);
      // route seedée par l'heure : varie à chaque démo, traverse la ville
      const route = world.randomRoute(makeRng(Date.now() % 100000), 2600);
      source = new ReplaySource(route, 12, 3, 1000);
    } else {
      source = new GpsSource();
    }

    const ok = await source.start((p) => onFix(p, set, get));
    if (!ok) {
      source = null;
      set({ status: 'idle', permissionDenied: true });
      return;
    }
    // réancrage du monde sur le 1er fix réel (la ville se pose où tu cours)
    timer = setInterval(() => get().tick(), 1000);
  },

  tick: () => {
    const s = get();
    if (s.status === 'running' && s.startedAt) {
      set({ elapsedMs: Date.now() - s.startedAt - s.pausedAccum });
      // perte de signal GPS → auto-pause
      if (s.mode === 'gps' && Date.now() - lastFixAt > AUTO_PAUSE_AFTER_MS) {
        set({ status: 'paused', pausedAt: Date.now(), autoPaused: true });
      }
    }
    // snapshot de récupération toutes les 15 s
    if ((s.status === 'running' || s.status === 'paused') && s.startedAt && s.elapsedMs % 15000 < 1000) {
      AsyncStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({
          at: Date.now(),
          startedAt: s.startedAt,
          pausedAccum: s.pausedAccum,
          mode: s.mode,
          segments: s.segments.map((seg) => simplify(seg, 8)),
          distanceM: s.distanceM,
          flaggedM: s.flaggedM,
        }),
      ).catch(() => {});
    }
  },

  pause: () => {
    if (get().status !== 'running') return;
    set({ status: 'paused', pausedAt: Date.now(), autoPaused: false });
  },

  resume: () => {
    const s = get();
    if (s.status !== 'paused' || !s.pausedAt) return;
    set({
      status: 'running',
      pausedAccum: s.pausedAccum + (Date.now() - s.pausedAt),
      pausedAt: null,
      autoPaused: false,
    });
    lastFixAt = Date.now();
  },

  stop: () => {
    source?.stop();
    source = null;
    if (timer) clearInterval(timer);
    timer = null;
    AsyncStorage.removeItem(SNAPSHOT_KEY).catch(() => {});
    const s = get();
    const simplifiedSegs = s.segments.filter((seg) => seg.length >= 2).map((seg) => simplify(seg, 5));
    const flat = allPoints(simplifiedSegs);
    const paintedM = Math.max(0, s.distanceM - s.flaggedM);
    const summary: RunSummary = {
      distanceM: s.distanceM,
      paintedM,
      elapsedMs: s.elapsedMs,
      startedAt: s.startedAt ?? Date.now(),
      points: flat,
      segments: simplifiedSegs,
      cells: s.invalidated ? [] : trackToCells(flat),
      tooShort: s.distanceM < 100,
      invalidated: s.invalidated,
      mode: s.mode,
    };
    set({ status: 'finished', lastSummary: summary });
    return summary;
  },

  discard: () => {
    source?.stop();
    source = null;
    if (timer) clearInterval(timer);
    timer = null;
    AsyncStorage.removeItem(SNAPSHOT_KEY).catch(() => {});
    set({ status: 'idle', segments: [], pointCount: 0, distanceM: 0, elapsedMs: 0, lastPoint: null });
  },
}));

function onFix(
  p: GeoPoint,
  set: (partial: Partial<RunState>) => void,
  get: () => RunState,
) {
  const s = get();
  // reprise auto après perte de signal
  if (s.status === 'paused' && s.autoPaused) {
    get().resume();
  }
  if (get().status !== 'running') return;
  if ((p.accuracy ?? 0) > 30) return; // filtre précision

  lastFixAt = Date.now();

  // réancrage du monde au tout premier fix GPS réel
  if (s.mode === 'gps' && s.pointCount === 0) {
    const app = useAppStore.getState();
    if (!app.worldAnchor) app.setWorldAnchor({ lat: p.lat, lon: p.lon });
  }

  const segments = s.segments.map((seg) => [...seg]);
  let active = segments[segments.length - 1];
  const prev = active[active.length - 1];

  let addedM = 0;
  let flagged = 0;
  let tooFastNow = s.tooFastNow;
  let invalidated = s.invalidated;

  if (prev) {
    const d = haversine(prev, p);
    const dt = Math.max(0.001, (p.t - prev.t) / 1000);
    const kmh = (d / dt) * 3.6;

    if (d > GAP_NEW_SEGMENT_M) {
      // trou GPS : nouveau segment, le saut ne compte pas
      active = [];
      segments.push(active);
    } else {
      addedM = d;
      // fenêtre de vitesse glissante 30 s
      speedWindow.push({ t: p.t, v: kmh });
      speedWindow = speedWindow.filter((w) => p.t - w.t <= 30000);
      const avg = speedWindow.reduce((a, w) => a + w.v, 0) / Math.max(1, speedWindow.length);
      tooFastNow = speedWindow.length >= 5 && avg > FAST_KMH;
      if (tooFastNow) flagged = d; // peinture suspendue
      if (speedWindow.length >= 8 && avg > INVALID_KMH) {
        if (!invalidWindowStart) invalidWindowStart = p.t;
        if (p.t - invalidWindowStart > 60000) invalidated = true; // > 40 km/h pendant 1 min
      } else {
        invalidWindowStart = 0;
      }
    }
  }
  active.push(p);

  set({
    segments,
    pointCount: s.pointCount + 1,
    distanceM: s.distanceM + addedM,
    flaggedM: s.flaggedM + flagged,
    tooFastNow,
    invalidated,
    lastPoint: p,
  });
}

/** Snapshot de récupération (app tuée pendant un run). */
export async function readRunSnapshot(): Promise<null | {
  at: number;
  startedAt: number;
  distanceM: number;
  segments: GeoPoint[][];
}> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (Date.now() - snap.at > 3 * 3600 * 1000) {
      AsyncStorage.removeItem(SNAPSHOT_KEY).catch(() => {});
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

export async function clearRunSnapshot() {
  AsyncStorage.removeItem(SNAPSHOT_KEY).catch(() => {});
}
