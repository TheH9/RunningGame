// Interface backend — UNIQUE point de contact des écrans avec les données.
// Factory : les env Supabase présents → SupabaseBackend, sinon DemoBackend.

import type { TeamSlug } from '../theme/tokens';
import type {
  Drop, Duel, FeedEvent, LiveEvent, RewardItem, Rival, RunnerScore,
  RunResult, RunSubmission, SeasonInfo, SponsorChallenge, TeamScore,
  TerritorySnapshot,
} from './types';

export interface GameBackend {
  init(profile: { pseudo: string | null; team: TeamSlug | null }): Promise<void>;
  getSeason(): Promise<SeasonInfo>;
  resetSeason(next: SeasonInfo): Promise<void>;
  getTerritory(): Promise<TerritorySnapshot>;
  submitRun(run: RunSubmission): Promise<RunResult>;
  /** flux temps réel : bots qui courent/peignent + feed. Retourne l'unsubscribe. */
  subscribeLive(cb: (e: LiveEvent) => void): () => void;
  getLeaderboards(): Promise<{ teams: TeamScore[]; runners: RunnerScore[]; friends: RunnerScore[] }>;
  getRivals(): Promise<Rival[]>;
  getDuels(): Promise<Duel[]>;
  startDuel(rivalId: string): Promise<Duel>;
  getFeed(limit: number): Promise<FeedEvent[]>;
  getActiveDrop(): Promise<Drop | null>;
  claimDrop(dropId: string): Promise<RewardItem>;
  getChallenge(): Promise<SponsorChallenge>;
  getChest(): Promise<RewardItem[]>;
  addToChest(item: RewardItem): Promise<void>;
  /** DemoBackend uniquement */
  resetDemo?(): Promise<void>;
}

let instance: GameBackend | null = null;

export function getBackend(): GameBackend {
  if (instance) return instance;
  const hasSupabase =
    !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (hasSupabase) {
    const { SupabaseBackend } = require('./SupabaseBackend') as typeof import('./SupabaseBackend');
    instance = new SupabaseBackend();
  } else {
    const { DemoBackend } = require('./DemoBackend') as typeof import('./DemoBackend');
    instance = new DemoBackend();
  }
  return instance;
}
