// Territoire vivant — cellules H3 multi-équipes + traces peintes + bots live.
// `version` est la clé de memo des calques carte : bot-move (60×/min) ne la
// bump JAMAIS ; seuls bot-paint / mes runs / resets re-rendent les veines.

import { create } from 'zustand';
import { getBackend } from '../backend/GameBackend';
import type { CellScore, LiveEvent, PaintedTrail } from '../backend/types';
import { cellView, paintCells, type CellView } from '../lib/territory';
import type { LatLon } from '../lib/world';
import type { TeamSlug } from '../theme/tokens';

export type LiveBot = {
  id: string;
  pseudo: string;
  team: TeamSlug;
  pos: LatLon;
  tail: LatLon[];
  lastSeen: number;
};

type TerritoryState = {
  hydrated: boolean;
  /** bump → les calques veines/hex re-rendent */
  version: number;
  cells: Map<string, CellScore>;
  trails: PaintedTrail[];
  bots: Map<string, LiveBot>;
  /** bump léger pour la couche bots (positions) */
  botsVersion: number;
  hydrate: () => Promise<void>;
  applyMyRun: (team: TeamSlug, pseudo: string, cells: string[], trail: PaintedTrail) => void;
  applyLive: (e: LiveEvent) => void;
  resetForSeason: () => Promise<void>;
  ownerOf: (h3: string) => CellView;
};

let unsubscribe: (() => void) | null = null;

export const useTerritoryStore = create<TerritoryState>((set, get) => ({
  hydrated: false,
  version: 0,
  cells: new Map(),
  trails: [],
  bots: new Map(),
  botsVersion: 0,

  hydrate: async () => {
    if (get().hydrated) return;
    const backend = getBackend();
    const snap = await backend.getTerritory();
    const cells = new Map(snap.cells.map((c) => [c.h3, c]));
    set({ hydrated: true, cells, trails: snap.trails, version: get().version + 1 });
    unsubscribe?.();
    unsubscribe = backend.subscribeLive((e) => get().applyLive(e));
  },

  applyMyRun: (team, pseudo, cellIds, trail) => {
    const cells = get().cells;
    paintCells(cells, team, pseudo, cellIds, Date.now());
    // borne mémoire : même plafond que les traces de bots (évite la croissance
    // illimitée sur une longue session / beaucoup de runs)
    set({ cells, trails: [...get().trails.slice(-149), trail], version: get().version + 1 });
  },

  applyLive: (e) => {
    if (e.kind === 'bot-move') {
      const bots = new Map(get().bots);
      bots.set(e.botId, { id: e.botId, pseudo: e.pseudo, team: e.team, pos: e.pos, tail: e.tail, lastSeen: Date.now() });
      // purge des bots disparus (> 10 s sans signal)
      for (const [id, b] of bots) if (Date.now() - b.lastSeen > 10000) bots.delete(id);
      set({ bots, botsVersion: get().botsVersion + 1 });
    } else if (e.kind === 'bot-paint') {
      const cells = get().cells;
      paintCells(cells, e.team, e.trail.runnerPseudo, e.cells, Date.now());
      set({ cells, trails: [...get().trails.slice(-149), e.trail], version: get().version + 1 });
    }
    // kind === 'feed' → géré par useSocialStore
  },

  resetForSeason: async () => {
    const snap = await getBackend().getTerritory();
    const cells = new Map(snap.cells.map((c) => [c.h3, c]));
    set({ cells, trails: snap.trails, bots: new Map(), version: get().version + 1 });
  },

  ownerOf: (h3) => {
    const c = get().cells.get(h3);
    if (!c) {
      return { owner: null, strength: 0, contested: false, challenger: null, fading: false, ownerPseudo: null, heldSinceMs: 0 };
    }
    return cellView(c, Date.now());
  },
}));
