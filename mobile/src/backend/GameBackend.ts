// Interface backend — UNIQUE point de contact des écrans avec les données.
// Production : SupabaseBackend, point. Les variables EXPO_PUBLIC_SUPABASE_*
// sont injectées au build (mobile/.env, créé par scripts/ensure-env.js) ;
// sans elles le client reste en lecture vide et l'auth bloque — un build mal
// configuré échoue visiblement plutôt que de basculer sur du contenu simulé.

import type { AvatarConfig } from '../lib/avatar';
import type { TeamSlug } from '../theme/tokens';
import type {
  Drop, Duel, FeedEvent, LiveEvent, RewardItem, Rival, RunnerScore,
  RunResult, RunSubmission, SeasonInfo, SponsorChallenge, TeamScore,
  TerritorySnapshot,
} from './types';

/** Profil local transmis au backend à l'init. */
export type BackendProfile = { pseudo: string | null; team: TeamSlug | null; avatar: AvatarConfig | null };

export interface GameBackend {
  init(profile: BackendProfile): Promise<void>;
  getSeason(): Promise<SeasonInfo>;
  resetSeason(next: SeasonInfo): Promise<void>;
  getTerritory(): Promise<TerritorySnapshot>;
  submitRun(run: RunSubmission): Promise<RunResult>;
  /** flux temps réel : feed de la ville (et demain, coureurs live). Retourne l'unsubscribe. */
  subscribeLive(cb: (e: LiveEvent) => void): () => void;
  getLeaderboards(): Promise<{ teams: TeamScore[]; runners: RunnerScore[]; friends: RunnerScore[] }>;
  getRivals(): Promise<Rival[]>;
  /** ajoute (on=true) ou retire (on=false) un coureur de ses amis */
  setFriend(rivalId: string, on: boolean): Promise<void>;
  getDuels(): Promise<Duel[]>;
  startDuel(rivalId: string): Promise<Duel>;
  getFeed(limit: number): Promise<FeedEvent[]>;
  getActiveDrop(): Promise<Drop | null>;
  claimDrop(dropId: string): Promise<RewardItem>;
  getChallenge(): Promise<SponsorChallenge>;
  getChest(): Promise<RewardItem[]>;
  addToChest(item: RewardItem): Promise<void>;
}

let instance: GameBackend | null = null;

export function getBackend(): GameBackend {
  if (instance) return instance;
  const { SupabaseBackend } = require('./SupabaseBackend') as typeof import('./SupabaseBackend');
  instance = new SupabaseBackend();
  return instance;
}
