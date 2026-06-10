// File d'événements du run — découplée de l'UI. push() déduplique par type
// (< 8 s) et déclenche l'haptique contextuelle ; LiveToastStack consomme.

import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import type { TeamSlug } from '../theme/tokens';

export type RunEventKind =
  | 'paint-milestone' | 'km-split' | 'capture' | 'contest' | 'defend'
  | 'pr' | 'drop-enter' | 'drop-qualified' | 'duel-tick'
  | 'gps-lost' | 'gps-back' | 'too-fast' | 'season-rollover';

export type RunEvent = {
  id: string;
  at: number;
  kind: RunEventKind;
  text: string;
  team?: TeamSlug;
  haptic: 'light' | 'medium' | 'success' | 'warning' | 'none';
};

type RunEventsState = {
  queue: RunEvent[];
  zonesPainted: number;
  zonesCaptured: number;
  zonesContested: number;
  push: (e: Omit<RunEvent, 'id' | 'at'>) => void;
  bumpZones: (painted: number, captured: number, contested: number) => void;
  consume: (id: string) => void;
  resetForRun: () => void;
};

let counter = 0;
const lastByKind = new Map<RunEventKind, number>();

function fireHaptic(h: RunEvent['haptic']) {
  try {
    if (h === 'light') Haptics.selectionAsync().catch(() => {});
    else if (h === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else if (h === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (h === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } catch {
    // web : pas d'haptique
  }
}

export const useRunEventsStore = create<RunEventsState>((set, get) => ({
  queue: [],
  zonesPainted: 0,
  zonesCaptured: 0,
  zonesContested: 0,

  push: (e) => {
    const now = Date.now();
    const last = lastByKind.get(e.kind) ?? 0;
    if (now - last < 8000) return; // anti-spam par type
    lastByKind.set(e.kind, now);
    fireHaptic(e.haptic);
    const event: RunEvent = { ...e, id: `ev-${counter++}`, at: now };
    set({ queue: [...get().queue.slice(-3), event] });
  },

  bumpZones: (painted, captured, contested) =>
    set({
      zonesPainted: get().zonesPainted + painted,
      zonesCaptured: get().zonesCaptured + captured,
      zonesContested: get().zonesContested + contested,
    }),

  consume: (id) => set({ queue: get().queue.filter((e) => e.id !== id) }),

  resetForRun: () => {
    lastByKind.clear();
    set({ queue: [], zonesPainted: 0, zonesCaptured: 0, zonesContested: 0 });
  },
}));
