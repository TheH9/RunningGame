// Social — amis/rivaux, duels 7 jours, feed d'activité (cloche).

import { create } from 'zustand';
import { getBackend } from '../backend/GameBackend';
import type { Duel, FeedEvent, Rival } from '../backend/types';

type SocialState = {
  hydrated: boolean;
  rivals: Rival[];
  duels: Duel[];
  feed: FeedEvent[];
  unread: number;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  challenge: (rivalId: string) => Promise<Duel>;
  markFeedRead: () => void;
};

let liveUnsub: (() => void) | null = null;

export const useSocialStore = create<SocialState>((set, get) => ({
  hydrated: false,
  rivals: [],
  duels: [],
  feed: [],
  unread: 0,

  hydrate: async () => {
    if (get().hydrated) return;
    await get().refresh();
    set({ hydrated: true });
    liveUnsub?.();
    liveUnsub = getBackend().subscribeLive((e) => {
      if (e.kind === 'feed') {
        set({ feed: [e.event, ...get().feed].slice(0, 60), unread: get().unread + 1 });
      }
    });
  },

  refresh: async () => {
    const backend = getBackend();
    const [rivals, duels, feed] = await Promise.all([
      backend.getRivals(),
      backend.getDuels(),
      backend.getFeed(40),
    ]);
    set({ rivals, duels, feed });
  },

  challenge: async (rivalId) => {
    const duel = await getBackend().startDuel(rivalId);
    set({ duels: [duel, ...get().duels.filter((d) => d.id !== duel.id)] });
    return duel;
  },

  markFeedRead: () => set({ unread: 0 }),
}));
