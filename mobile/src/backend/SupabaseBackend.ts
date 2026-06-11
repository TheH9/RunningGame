// Backend de production — implémente GameBackend contre le schéma Supabase
// (migrations 0001→0005). Lectures via les vues/RPC publiques (RLS : lecture
// publique), écritures sous la session de l'utilisateur (auth anonyme), scoring
// délégué à l'edge function `score-run` (service_role). Conçu pour être tolérant
// aux pannes : toute requête en échec retombe sur une valeur vide plutôt que de
// casser l'UI.

import { supabase, uploadRunPoints, finishRun } from '../lib/supabase';
import { trackToCells } from '../lib/territory';
import { TEAMS, type TeamSlug } from '../theme/tokens';
import type { GeoPoint } from '../lib/geo';
import type { GameBackend } from './GameBackend';
import type {
  CellScore, Drop, Duel, FeedEvent, LiveEvent, PaintedTrail, RewardItem, Rival,
  RunnerScore, RunResult, RunSubmission, SeasonInfo, SponsorChallenge, TeamScore,
  TerritorySnapshot,
} from './types';

const SEASON_MS = 42 * 24 * 3600 * 1000;

/** ms epoch depuis un timestamptz Postgres (ISO) ou un nombre déjà en ms. */
function ms(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Date.parse(v);
}

export class SupabaseBackend implements GameBackend {
  private profile: { pseudo: string | null; team: TeamSlug | null } = { pseudo: null, team: null };
  private userId: string | null = null;
  private cityId: string | null = null;
  private teamIdBySlug = new Map<TeamSlug, string>();
  private slugByTeamId = new Map<string, TeamSlug>();
  private ready: Promise<void> | null = null;

  async init(profile: { pseudo: string | null; team: TeamSlug | null }): Promise<void> {
    this.profile = profile;
    if (!this.ready) this.ready = this.bootstrap();
    await this.ready;
    await this.syncProfile();
  }

  /** Référentiel (ville + équipes) + session anonyme. Une seule fois. */
  private async bootstrap(): Promise<void> {
    if (!supabase) return;
    // Référentiel : ville de lancement (la plus ancienne) + ses équipes.
    const { data: city } = await supabase
      .from('cities').select('id').order('created_at').limit(1).maybeSingle();
    this.cityId = city?.id ?? null;
    if (this.cityId) {
      const { data: teams } = await supabase
        .from('teams').select('id, slug').eq('city_id', this.cityId);
      for (const t of teams ?? []) {
        this.teamIdBySlug.set(t.slug as TeamSlug, t.id);
        this.slugByTeamId.set(t.id, t.slug as TeamSlug);
      }
    }
    // Session : réutilise une session existante, sinon connexion anonyme.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.userId = session.user.id;
    } else {
      const { data, error } = await supabase.auth.signInAnonymously();
      // Auth anonyme non activée côté projet → on reste en lecture seule.
      if (!error) this.userId = data.user?.id ?? null;
    }
  }

  /** Aligne le profil serveur (pseudo / équipe) sur le choix d'onboarding. */
  private async syncProfile(): Promise<void> {
    if (!supabase || !this.userId) return;
    const teamId = this.profile.team ? this.teamIdBySlug.get(this.profile.team) ?? null : null;
    await supabase.from('profiles').upsert({
      id: this.userId,
      pseudo: this.profile.pseudo ?? 'Coureur',
      team_id: teamId,
      city_id: this.cityId,
    }, { onConflict: 'id' });
  }

  async getSeason(): Promise<SeasonInfo> {
    await this.ready;
    const now = Date.now();
    const fallback: SeasonInfo = { number: 1, startsAt: now, endsAt: now + SEASON_MS, durationDays: 42 };
    if (!supabase || !this.cityId) return fallback;
    const { data } = await supabase
      .from('seasons')
      .select('number, starts_at, ends_at, duration_days')
      .eq('city_id', this.cityId).eq('status', 'live')
      .order('number', { ascending: false }).limit(1).maybeSingle();
    if (!data) return fallback;
    return {
      number: data.number,
      startsAt: ms(data.starts_at),
      endsAt: ms(data.ends_at),
      durationDays: data.duration_days,
    };
  }

  // Le reset de saison est un job serveur (rollover_seasons via cron). No-op client.
  async resetSeason(_next: SeasonInfo): Promise<void> {}

  async getTerritory(): Promise<TerritorySnapshot> {
    await this.ready;
    if (!supabase || !this.cityId) return { cells: [], trails: [] };

    const [cellsRes, trailsRes] = await Promise.all([
      supabase.from('territory_cells')
        .select('h3_index, team_id, score, last_seen, last_runner_pseudo')
        .eq('city_id', this.cityId),
      supabase.rpc('recent_trails', { p_city: this.cityId, p_limit: 120 }),
    ]);

    // Reconstruit les CellScore (scores coexistants par équipe) depuis les
    // lignes (h3, team) de territory_cells.
    const byCell = new Map<string, CellScore>();
    for (const r of cellsRes.data ?? []) {
      const team = this.slugByTeamId.get(r.team_id);
      if (!team) continue;
      let cell = byCell.get(r.h3_index);
      if (!cell) {
        cell = { h3: r.h3_index, scores: {}, lastPaint: {}, lastRunner: {} };
        byCell.set(r.h3_index, cell);
      }
      cell.scores[team] = r.score;
      cell.lastPaint[team] = ms(r.last_seen);
      if (r.last_runner_pseudo) cell.lastRunner[team] = r.last_runner_pseudo;
    }

    const trails: PaintedTrail[] = ((trailsRes.data as TrailRow[]) ?? []).map((t) => ({
      id: t.id,
      team: t.team,
      runnerPseudo: t.runnerPseudo,
      paintedAt: t.paintedAt,
      // recent_trails renvoie [lon, lat] ; le client manipule { lat, lon }.
      points: (t.points ?? []).map(([lon, lat]) => ({ lat, lon, t: 0 } as GeoPoint)),
    }));

    return { cells: [...byCell.values()], trails };
  }

  async submitRun(run: RunSubmission): Promise<RunResult> {
    await this.ready;
    const allCells: string[] = [];
    for (const seg of run.segments) if (seg.length >= 2) allCells.push(...trackToCells(seg));
    const teamId = this.profile.team ? this.teamIdBySlug.get(this.profile.team) : undefined;

    // Sans session ou sans équipe, on ne peut pas écrire (RLS) : la trace reste
    // peinte localement, on renvoie juste les cellules pour le récap.
    if (!supabase || !this.userId || !teamId) {
      return { paintedCells: allCells, captured: [], contested: [], defended: [] };
    }

    const { data: created, error } = await supabase
      .from('runs')
      .insert({
        user_id: this.userId,
        team_id: teamId,
        status: 'active',
        started_at: new Date(run.startedAt).toISOString(),
        distance_m: run.distanceM,
        painted_m: run.paintedM,
      })
      .select('id').single();
    if (error || !created) {
      return { paintedCells: allCells, captured: [], contested: [], defended: [] };
    }

    // Upload des segments (Douglas-Peucker déjà appliqué côté client).
    for (const seg of run.segments) {
      if (seg.length < 2) continue;
      await uploadRunPoints(created.id, seg.map((p) => ({ lat: p.lat, lon: p.lon, t: p.t, accuracy: p.accuracy })));
    }
    // Clôture + déclenche le scoring serveur (edge function, source de vérité).
    await finishRun(created.id, run.distanceM, run.paintedM);

    // Le scoring est asynchrone : captured/contested/defended arriveront via
    // Realtime. On renvoie les cellules peintes pour le récap immédiat.
    return { paintedCells: allCells, captured: [], contested: [], defended: [] };
  }

  subscribeLive(cb: (e: LiveEvent) => void): () => void {
    const sb = supabase;
    if (!sb) return () => {};
    // Realtime : les nouveaux feed_events de la ville deviennent des LiveEvent.
    const channel = sb
      .channel('bornes-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events' },
        (payload) => {
          const r = payload.new as FeedRow;
          if (this.cityId && r.city_id !== this.cityId) return;
          cb({ kind: 'feed', event: this.toFeedEvent(r) });
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }

  async getLeaderboards(): Promise<{ teams: TeamScore[]; runners: RunnerScore[]; friends: RunnerScore[] }> {
    await this.ready;
    if (!supabase || !this.cityId) return { teams: [], runners: [], friends: [] };

    const [teamRes, runnerRes, friendIds] = await Promise.all([
      supabase.from('team_scores').select('team_id, cells').eq('city_id', this.cityId),
      supabase.from('runner_scores')
        .select('user_id, pseudo, team_slug, week_painted_m')
        .eq('city_id', this.cityId)
        .order('week_painted_m', { ascending: false }).limit(100),
      this.friendIds(),
    ]);

    const total = Math.max(1, (teamRes.data ?? []).reduce((a, t) => a + (t.cells ?? 0), 0));
    const teams: TeamScore[] = (teamRes.data ?? [])
      .map((t) => {
        const team = this.slugByTeamId.get(t.team_id);
        return team ? { team, cells: t.cells ?? 0, percent: Math.round(((t.cells ?? 0) / total) * 100) } : null;
      })
      .filter((t): t is TeamScore => t !== null)
      .sort((a, b) => b.cells - a.cells);

    const runners: RunnerScore[] = (runnerRes.data ?? []).map((r) => ({
      pseudo: r.pseudo,
      team: r.team_slug as TeamSlug,
      paintedKm: (r.week_painted_m ?? 0) / 1000,
      isMe: r.user_id === this.userId,
      isFriend: friendIds.has(r.user_id),
    }));
    const friends = runners.filter((r) => r.isFriend || r.isMe);
    return { teams, runners, friends };
  }

  async getRivals(): Promise<Rival[]> {
    await this.ready;
    if (!supabase || !this.cityId) return [];
    const [{ data }, friendIds] = await Promise.all([
      supabase.from('runner_scores')
        .select('user_id, pseudo, team_slug, signature_street, title, week_painted_m, total_painted_m, runs_week')
        .eq('city_id', this.cityId)
        .order('week_painted_m', { ascending: false }).limit(60),
      this.friendIds(),
    ]);
    return (data ?? [])
      .filter((r) => r.user_id !== this.userId)
      .map((r) => {
        const team = r.team_slug as TeamSlug;
        return {
          id: r.user_id,
          pseudo: r.pseudo,
          team,
          isFriend: friendIds.has(r.user_id),
          emoji: TEAMS[team]?.emoji ?? '🏃',
          weekPaintedM: r.week_painted_m ?? 0,
          totalPaintedM: r.total_painted_m ?? 0,
          runsPerWeek: r.runs_week ?? 0,
          signatureStreet: r.signature_street ?? '',
          title: r.title ?? null,
        };
      });
  }

  async setFriend(rivalId: string, on: boolean): Promise<void> {
    if (!supabase || !this.userId) return;
    if (on) {
      await supabase.from('friendships').upsert(
        { user_id: this.userId, friend_id: rivalId, status: 'accepted' },
        { onConflict: 'user_id,friend_id' },
      );
    } else {
      await supabase.from('friendships').delete()
        .eq('user_id', this.userId).eq('friend_id', rivalId);
    }
  }

  async getDuels(): Promise<Duel[]> {
    await this.ready;
    if (!supabase || !this.userId) return [];
    const [duelsRes, liveRes] = await Promise.all([
      supabase.from('duels')
        .select('id, a_user_id, b_user_id, started_at, ends_at, a_painted_m, b_painted_m, status')
        .or(`a_user_id.eq.${this.userId},b_user_id.eq.${this.userId}`)
        .order('started_at', { ascending: false }).limit(20),
      supabase.from('duel_live').select('id, a_live_m, b_live_m'),
    ]);
    const live = new Map((liveRes.data ?? []).map((l) => [l.id, l]));
    return (duelsRes.data ?? []).map((d) => {
      const meIsA = d.a_user_id === this.userId;
      const l = live.get(d.id);
      const myPaintedM = d.status === 'active'
        ? (meIsA ? l?.a_live_m : l?.b_live_m) ?? 0
        : (meIsA ? d.a_painted_m : d.b_painted_m);
      const rivalPaintedM = d.status === 'active'
        ? (meIsA ? l?.b_live_m : l?.a_live_m) ?? 0
        : (meIsA ? d.b_painted_m : d.a_painted_m);
      let status: Duel['status'] = 'active';
      if (d.status !== 'active') {
        const iWon = (meIsA && d.status === 'a_won') || (!meIsA && d.status === 'b_won');
        status = iWon ? 'won' : 'lost';
      }
      return {
        id: d.id,
        rivalId: meIsA ? d.b_user_id : d.a_user_id,
        startedAt: ms(d.started_at),
        endsAt: ms(d.ends_at),
        myPaintedM,
        rivalPaintedM,
        status,
      };
    });
  }

  async startDuel(rivalId: string): Promise<Duel> {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error } = await supabase.rpc('start_duel', { p_rival: rivalId });
    if (error || !data) throw new Error(error?.message ?? 'duel impossible');
    const d = Array.isArray(data) ? data[0] : data;
    return {
      id: d.id,
      rivalId,
      startedAt: ms(d.started_at),
      endsAt: ms(d.ends_at),
      myPaintedM: 0,
      rivalPaintedM: 0,
      status: 'active',
    };
  }

  async getFeed(limit: number): Promise<FeedEvent[]> {
    await this.ready;
    if (!supabase || !this.cityId) return [];
    const { data } = await supabase.from('feed_events')
      .select('id, kind, text, team_id, actor, created_at')
      .eq('city_id', this.cityId)
      .order('created_at', { ascending: false }).limit(limit);
    return (data ?? []).map((r) => this.toFeedEvent(r as FeedRow));
  }

  async getActiveDrop(): Promise<Drop | null> {
    await this.ready;
    if (!supabase || !this.cityId) return null;
    const nowIso = new Date().toISOString();
    const { data } = await supabase.from('drops_public')
      .select('id, lon, lat, radius_m, window_start, window_end, prize, partner_name')
      .eq('city_id', this.cityId).eq('status', 'open')
      .lte('window_start', nowIso).gte('window_end', nowIso)
      .order('window_end', { ascending: true }).limit(1).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      center: { lat: data.lat, lon: data.lon },
      radiusM: data.radius_m,
      startsAt: ms(data.window_start),
      endsAt: ms(data.window_end),
      title: data.prize,
      partner: data.partner_name ?? '',
      emoji: '🎁',
    };
  }

  async claimDrop(dropId: string): Promise<RewardItem> {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error } = await supabase.rpc('claim_drop', { p_drop_id: dropId });
    if (error || !data) throw new Error(error?.message ?? 'réclamation impossible');
    const row = Array.isArray(data) ? data[0] : data;
    return this.toReward(row);
  }

  async getChallenge(): Promise<SponsorChallenge> {
    await this.ready;
    const now = Date.now();
    const monthEnd = (() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    })();
    const fallback: SponsorChallenge = {
      title: 'Défi du mois', partner: '', description: '', prize: '', emoji: '🎽', goalKm: 25, endsAt: monthEnd,
    };
    if (!supabase || !this.cityId) return fallback;
    const { data } = await supabase.from('challenges_public')
      .select('title, prize, partner_name, status')
      .eq('city_id', this.cityId).eq('status', 'live')
      .order('month', { ascending: false }).limit(1).maybeSingle();
    if (!data) return fallback;
    return {
      title: data.title,
      partner: data.partner_name ?? '',
      description: data.title,
      prize: data.prize,
      emoji: '🎽',
      goalKm: 25,
      endsAt: monthEnd,
    };
  }

  async getChest(): Promise<RewardItem[]> {
    await this.ready;
    if (!supabase || !this.userId) return [];
    const { data } = await supabase.from('prizes_won')
      .select('id, title, partner, emoji, qr_code, created_at')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    return (data ?? []).map((r) => this.toReward(r));
  }

  // Les lots sont mintés côté serveur (claim_drop). No-op : le coffre se
  // recharge via getChest().
  async addToChest(_item: RewardItem): Promise<void> {}

  // --- helpers ---

  private async friendIds(): Promise<Set<string>> {
    if (!supabase || !this.userId) return new Set();
    const { data } = await supabase.from('friendships')
      .select('friend_id').eq('user_id', this.userId).eq('status', 'accepted');
    return new Set((data ?? []).map((f) => f.friend_id));
  }

  private toFeedEvent(r: FeedRow): FeedEvent {
    return {
      id: r.id,
      at: ms(r.created_at),
      kind: r.kind as FeedEvent['kind'],
      text: r.text,
      team: r.team_id ? this.slugByTeamId.get(r.team_id) : undefined,
      actor: r.actor ?? undefined,
    };
  }

  private toReward(r: RewardRow): RewardItem {
    return {
      id: r.id,
      title: r.title || 'Lot',
      partner: r.partner ?? '',
      emoji: r.emoji ?? '🎁',
      qrPayload: r.qr_code,
      wonAt: ms(r.created_at),
    };
  }
}

// Formes brutes des lignes/RPC Supabase (jsonb / select).
type TrailRow = { id: string; team: TeamSlug; runnerPseudo: string; paintedAt: number; points: [number, number][] };
type FeedRow = { id: string; kind: string; text: string; team_id: string | null; actor: string | null; created_at: string; city_id?: string };
type RewardRow = { id: string; title: string; partner: string | null; emoji: string | null; qr_code: string; created_at: string };
