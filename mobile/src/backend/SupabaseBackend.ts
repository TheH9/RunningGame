// Squelette du backend de production — mêmes signatures que DemoBackend.
// Activé automatiquement par la factory quand EXPO_PUBLIC_SUPABASE_URL et
// EXPO_PUBLIC_SUPABASE_ANON_KEY sont définis. Chaque méthode mappe vers le
// schéma supabase/migrations/0001_init.sql (territory_cells, team_scores…).

import { supabase, uploadRunPoints, finishRun } from '../lib/supabase';
import type { TeamSlug } from '../theme/tokens';
import type { GameBackend } from './GameBackend';
import type {
  Drop, Duel, FeedEvent, LiveEvent, RewardItem, Rival, RunnerScore,
  RunResult, RunSubmission, SeasonInfo, SponsorChallenge, TeamScore,
  TerritorySnapshot,
} from './types';

export class SupabaseBackend implements GameBackend {
  private profile: { pseudo: string | null; team: TeamSlug | null } = { pseudo: null, team: null };

  async init(profile: { pseudo: string | null; team: TeamSlug | null }): Promise<void> {
    this.profile = profile;
    // TODO(clés API) : auth anonyme/OTP Supabase + upsert du profil
  }

  async getSeason(): Promise<SeasonInfo> {
    // TODO(clés API) : table seasons (à ajouter en migration 0002)
    const now = Date.now();
    return { number: 1, startsAt: now, endsAt: now + 42 * 24 * 3600 * 1000, durationDays: 42 };
  }

  async resetSeason(_next: SeasonInfo): Promise<void> {
    // TODO(clés API) : le reset de saison est un job serveur (cron), no-op client
  }

  async getTerritory(): Promise<TerritorySnapshot> {
    // TODO(clés API) : select sur la vue territory_owner + runs récents (trails)
    if (!supabase) throw new Error('Supabase non configuré');
    return { cells: [], trails: [] };
  }

  async submitRun(run: RunSubmission): Promise<RunResult> {
    // TODO(clés API) : insert runs → uploadRunPoints(segments) → finishRun()
    // (l'edge function score-run fait le scoring serveur, source de vérité)
    void uploadRunPoints;
    void finishRun;
    void run;
    return { paintedCells: [], captured: [], contested: [], defended: [] };
  }

  subscribeLive(_cb: (e: LiveEvent) => void): () => void {
    // TODO(clés API) : Supabase Realtime sur territory_cells + run_points
    return () => {};
  }

  async getLeaderboards(): Promise<{ teams: TeamScore[]; runners: RunnerScore[]; friends: RunnerScore[] }> {
    // TODO(clés API) : vue team_scores + agrégat runs par utilisateur
    return { teams: [], runners: [], friends: [] };
  }

  async getRivals(): Promise<Rival[]> {
    // TODO(clés API) : profils de la même ville
    return [];
  }

  async getDuels(): Promise<Duel[]> {
    // TODO(clés API) : table duels (migration 0002)
    return [];
  }

  async startDuel(_rivalId: string): Promise<Duel> {
    throw new Error('TODO(clés API)');
  }

  async getFeed(_limit: number): Promise<FeedEvent[]> {
    // TODO(clés API) : table feed_events alimentée par triggers
    return [];
  }

  async getActiveDrop(): Promise<Drop | null> {
    // TODO(clés API) : table drops (fenêtre active)
    return null;
  }

  async claimDrop(_dropId: string): Promise<RewardItem> {
    throw new Error('TODO(clés API)');
  }

  async getChallenge(): Promise<SponsorChallenge> {
    // TODO(clés API) : table challenges (mois en cours)
    const now = Date.now();
    return {
      title: '', partner: '', description: '', prize: '', emoji: '🎽',
      goalKm: 25, endsAt: now,
    };
  }

  async getChest(): Promise<RewardItem[]> {
    // TODO(clés API) : table prizes_won du joueur
    return [];
  }

  async addToChest(_item: RewardItem): Promise<void> {
    // TODO(clés API)
  }
}
