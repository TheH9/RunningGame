// Backend démo — multijoueur simulé, persisté localement. Le monde vit :
// bots en live au premier plan, rattrapage accéléré du temps manqué à l'init.
// Mêmes signatures que SupabaseBackend → brancher la prod = zéro réécriture.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackToCells, paintCells } from '../lib/territory';
import { DEFAULT_ANCHOR, getWorld, districtAt, makeRng, type LatLon } from '../lib/world';
import { simplify } from '../lib/geo';
import { TEAMS, type TeamSlug } from '../theme/tokens';
import { BotEngine } from './botEngine';
import { buildChallenge, buildSeed, buildWeeklyDrop } from './demoSeed';
import type { GameBackend } from './GameBackend';
import type {
  CellScore, Drop, Duel, FeedEvent, LiveEvent, PaintedTrail, RewardItem,
  Rival, RunnerScore, RunResult, RunSubmission, SeasonInfo, SponsorChallenge,
  TeamScore, TerritorySnapshot,
} from './types';
import { useAppStore } from '../store/useAppStore';

const STORE_KEY = 'bornes-demo-v1';
const MAX_TRAILS = 150;
const MAX_FEED = 60;
const SEASON_MS = 42 * 24 * 3600 * 1000; // 6 semaines

type PersistedState = {
  season: SeasonInfo;
  cells: [string, CellScore][];
  trails: PaintedTrail[];
  rivals: Rival[];
  duels: Duel[];
  chest: RewardItem[];
  feed: FeedEvent[];
  claimedDrops: string[];
  myPaintedKm: number;
  lastSimAt: number;
};

export class DemoBackend implements GameBackend {
  private season!: SeasonInfo;
  private cells = new Map<string, CellScore>();
  private trails: PaintedTrail[] = [];
  private rivals: Rival[] = [];
  private duels: Duel[] = [];
  private chest: RewardItem[] = [];
  private feed: FeedEvent[] = [];
  private claimedDrops: string[] = [];
  private myPaintedKm = 0;
  private profile: { pseudo: string | null; team: TeamSlug | null } = { pseudo: null, team: null };
  private listeners = new Set<(e: LiveEvent) => void>();
  private engine: BotEngine | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private ready: Promise<void> | null = null;

  private get anchor(): LatLon {
    return useAppStore.getState().worldAnchor ?? DEFAULT_ANCHOR;
  }

  async init(profile: { pseudo: string | null; team: TeamSlug | null }): Promise<void> {
    this.profile = profile;
    if (!this.ready) this.ready = this.load();
    await this.ready;
    this.startEngine();
  }

  private async load() {
    const now = Date.now();
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      if (raw) {
        const s: PersistedState = JSON.parse(raw);
        this.season = s.season;
        this.cells = new Map(s.cells);
        this.trails = s.trails;
        this.rivals = s.rivals;
        this.duels = s.duels;
        this.chest = s.chest;
        this.feed = s.feed;
        this.claimedDrops = s.claimedDrops ?? [];
        this.myPaintedKm = s.myPaintedKm ?? 0;
        this.catchUp(s.lastSimAt, now);
        return;
      }
    } catch {
      // état corrompu → re-seed
    }
    this.seedFresh(now);
  }

  private seedFresh(now: number) {
    this.season = { number: 1, startsAt: now, endsAt: now + SEASON_MS, durationDays: 42 };
    const seed = buildSeed(this.anchor, 1, now);
    this.cells = seed.cells;
    this.trails = seed.trails;
    this.rivals = seed.rivals;
    this.feed = seed.feed;
    this.duels = [];
    this.chest = [];
    this.claimedDrops = [];
    this.myPaintedKm = 0;
    this.save();
  }

  /** Rattrapage du temps manqué : le monde a vécu pendant l'absence. */
  private catchUp(lastSimAt: number, now: number) {
    const hours = Math.min(24 * 7, (now - lastSimAt) / 3600000);
    if (hours < 2) return;
    const world = getWorld(this.anchor);
    const rng = makeRng(now % 100000);
    // ~1 run de bot par tranche de 5 h d'absence
    const nRuns = Math.min(20, Math.floor(hours / 5));
    for (let i = 0; i < nRuns; i++) {
      const rival = this.rivals[Math.floor(rng() * this.rivals.length)];
      const route = world.randomRoute(rng, 1200 + rng() * 1800);
      if (route.length < 4) continue;
      const at = lastSimAt + ((i + 1) / (nRuns + 1)) * (now - lastSimAt);
      const pts = simplify(route, 10);
      const trail: PaintedTrail = { id: `catchup-${at}-${i}`, team: rival.team, runnerPseudo: rival.pseudo, points: pts, paintedAt: at };
      this.pushTrail(trail);
      const diff = paintCells(this.cells, rival.team, rival.pseudo, trackToCells(pts), at);
      rival.weekPaintedM += 1500 + rng() * 1500;
      if (diff.captured.length > 4) {
        const d = districtAt(world, pts[Math.floor(pts.length / 2)]);
        this.pushFeed({
          id: `catchup-feed-${at}`, at, kind: 'capture', team: rival.team, actor: rival.pseudo,
          text: `${rival.emoji} ${rival.pseudo} a gagné du terrain${d ? ` à ${d.name}` : ''} pour ${TEAMS[rival.team].name}`,
        });
      }
      // progression des duels actifs pendant l'absence
      for (const duel of this.duels) {
        if (duel.status === 'active' && duel.rivalId === rival.id) duel.rivalPaintedM += 1200 + rng() * 1200;
      }
    }
    this.settleDuels(now);
    this.save();
  }

  private startEngine() {
    if (this.engine) return;
    this.engine = new BotEngine(this.anchor, this.rivals, (e) => this.onLive(e));
    this.engine.start();
  }

  private onLive(e: LiveEvent) {
    if (e.kind === 'bot-paint') {
      this.pushTrail(e.trail);
      const at = Date.now();
      const diff = paintCells(this.cells, e.team, e.trail.runnerPseudo, e.cells, at);
      const rival = this.rivals.find((r) => r.id === e.botId);
      if (rival) {
        rival.weekPaintedM += 200;
        for (const duel of this.duels) {
          if (duel.status === 'active' && duel.rivalId === rival.id) duel.rivalPaintedM += 200;
        }
      }
      // gros gain → feed
      if (rival && diff.captured.length >= 4) {
        const world = getWorld(this.anchor);
        const d = districtAt(world, e.trail.points[Math.floor(e.trail.points.length / 2)]);
        const ev: FeedEvent = {
          id: `live-feed-${at}`, at, kind: 'steal', team: e.team, actor: rival.pseudo,
          text: `${rival.emoji} ${rival.pseudo} vient de prendre ${diff.captured.length} zones${d ? ` à ${d.name}` : ''} !`,
        };
        this.pushFeed(ev);
        this.emit({ kind: 'feed', event: ev });
      }
      this.scheduleSave();
    }
    this.emit(e);
  }

  private emit(e: LiveEvent) {
    for (const cb of this.listeners) cb(e);
  }

  private pushTrail(t: PaintedTrail) {
    this.trails.push(t);
    if (this.trails.length > MAX_TRAILS) this.trails.splice(0, this.trails.length - MAX_TRAILS);
  }

  private pushFeed(e: FeedEvent) {
    this.feed.unshift(e);
    if (this.feed.length > MAX_FEED) this.feed.length = MAX_FEED;
  }

  private settleDuels(now: number) {
    for (const duel of this.duels) {
      if (duel.status === 'active' && now > duel.endsAt) {
        duel.status = duel.myPaintedM >= duel.rivalPaintedM ? 'won' : 'lost';
        const rival = this.rivals.find((r) => r.id === duel.rivalId);
        if (rival) {
          this.pushFeed({
            id: `duel-end-${duel.id}`, at: now, kind: 'duel', actor: rival.pseudo,
            text: duel.status === 'won'
              ? `🏆 Tu as battu ${rival.pseudo} en duel ! ${(duel.myPaintedM / 1000).toFixed(1)} km à ${(duel.rivalPaintedM / 1000).toFixed(1)} km`
              : `😤 ${rival.pseudo} t'a battu en duel… revanche ?`,
          });
        }
      }
    }
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 2000);
  }

  private save() {
    const s: PersistedState = {
      season: this.season,
      cells: [...this.cells.entries()].slice(-5000),
      trails: this.trails,
      rivals: this.rivals,
      duels: this.duels,
      chest: this.chest,
      feed: this.feed,
      claimedDrops: this.claimedDrops,
      myPaintedKm: this.myPaintedKm,
      lastSimAt: Date.now(),
    };
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(s)).catch(() => {});
  }

  // --- API GameBackend ---

  async getSeason(): Promise<SeasonInfo> {
    await this.ready;
    return this.season;
  }

  async resetSeason(next: SeasonInfo): Promise<void> {
    this.season = next;
    const seed = buildSeed(this.anchor, next.number, Date.now());
    // carte vierge + léger re-seed (5-6 traces fraîches pour ne pas être morte)
    this.cells = new Map();
    this.trails = [];
    const fresh = seed.trails.slice(0, 6);
    for (const t of fresh) {
      t.paintedAt = Date.now() - Math.random() * 12 * 3600 * 1000;
      this.pushTrail(t);
      paintCells(this.cells, t.team, t.runnerPseudo, trackToCells(t.points), t.paintedAt);
    }
    for (const r of this.rivals) r.weekPaintedM = 0;
    this.myPaintedKm = 0;
    this.pushFeed({
      id: `season-${next.number}`, at: Date.now(), kind: 'season',
      text: `🏁 Saison ${next.number} lancée — la carte est remise à zéro, tout est à prendre !`,
    });
    this.save();
  }

  async getTerritory(): Promise<TerritorySnapshot> {
    await this.ready;
    return { cells: [...this.cells.values()], trails: this.trails };
  }

  async submitRun(run: RunSubmission): Promise<RunResult> {
    await this.ready;
    const team = this.profile.team ?? 'vagues';
    const pseudo = this.profile.pseudo ?? 'Moi';
    const at = Date.now();
    const allCells: string[] = [];
    for (const seg of run.segments) {
      if (seg.length >= 2) {
        const trail: PaintedTrail = { id: `me-${at}-${allCells.length}`, team, runnerPseudo: pseudo, points: seg, paintedAt: at };
        this.pushTrail(trail);
        allCells.push(...trackToCells(seg));
      }
    }
    const diff = paintCells(this.cells, team, pseudo, allCells, at);
    this.myPaintedKm += run.paintedM / 1000;
    for (const duel of this.duels) {
      if (duel.status === 'active') duel.myPaintedM += run.paintedM;
    }
    this.settleDuels(at);
    if (diff.captured.length >= 3) {
      this.pushFeed({
        id: `me-feed-${at}`, at, kind: 'capture', team, actor: pseudo,
        text: `🔥 Tu as pris ${diff.captured.length} zones pour ${TEAMS[team].name} !`,
      });
    }
    this.save();
    return { paintedCells: allCells, captured: diff.captured, contested: diff.contested, defended: diff.reinforced };
  }

  subscribeLive(cb: (e: LiveEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async getLeaderboards() {
    await this.ready;
    const now = Date.now();
    // équipes : par cellules possédées
    const counts: Record<TeamSlug, number> = { vagues: 0, braises: 0, soleils: 0, pousses: 0 };
    const { cellView } = await import('../lib/territory');
    for (const c of this.cells.values()) {
      const v = cellView(c, now);
      if (v.owner) counts[v.owner]++;
    }
    const total = Math.max(1, Object.values(counts).reduce((a, b) => a + b, 0));
    const teams: TeamScore[] = (Object.keys(counts) as TeamSlug[])
      .map((team) => ({ team, cells: counts[team], percent: Math.round((counts[team] / total) * 100) }))
      .sort((a, b) => b.cells - a.cells);

    const me: RunnerScore = {
      pseudo: this.profile.pseudo ?? 'Moi',
      team: this.profile.team ?? 'vagues',
      paintedKm: this.myPaintedKm,
      isMe: true,
    };
    const runners: RunnerScore[] = [
      ...this.rivals.map((r) => ({
        pseudo: r.pseudo, team: r.team, paintedKm: r.weekPaintedM / 1000, isFriend: r.isFriend,
      })),
      me,
    ].sort((a, b) => b.paintedKm - a.paintedKm);
    const friends = runners.filter((r) => r.isFriend || r.isMe);
    return { teams, runners, friends };
  }

  async getRivals(): Promise<Rival[]> {
    await this.ready;
    return this.rivals;
  }

  async getDuels(): Promise<Duel[]> {
    await this.ready;
    this.settleDuels(Date.now());
    return this.duels;
  }

  async startDuel(rivalId: string): Promise<Duel> {
    await this.ready;
    const now = Date.now();
    const duel: Duel = {
      id: `duel-${now}`, rivalId, startedAt: now, endsAt: now + 7 * 24 * 3600 * 1000,
      myPaintedM: 0, rivalPaintedM: 0, status: 'active',
    };
    this.duels.unshift(duel);
    const rival = this.rivals.find((r) => r.id === rivalId);
    if (rival) {
      this.pushFeed({
        id: `duel-start-${now}`, at: now, kind: 'duel', actor: rival.pseudo,
        text: `⚔️ Duel lancé contre ${rival.emoji} ${rival.pseudo} — 7 jours pour peindre plus !`,
      });
    }
    this.save();
    return duel;
  }

  async getFeed(limit: number): Promise<FeedEvent[]> {
    await this.ready;
    return this.feed.slice(0, limit);
  }

  async getActiveDrop(): Promise<Drop | null> {
    await this.ready;
    const drop = buildWeeklyDrop(this.anchor, this.season.number, Date.now());
    return this.claimedDrops.includes(drop.id) ? null : drop;
  }

  async claimDrop(dropId: string): Promise<RewardItem> {
    await this.ready;
    const drop = buildWeeklyDrop(this.anchor, this.season.number, Date.now());
    const item: RewardItem = {
      id: `reward-${dropId}`,
      title: 'Bon d’achat 15 €',
      partner: drop.partner,
      emoji: '🎁',
      qrPayload: `BORNES-DEMO-${dropId}`,
      wonAt: Date.now(),
    };
    this.claimedDrops.push(dropId);
    this.chest.unshift(item);
    this.pushFeed({ id: `drop-claim-${dropId}`, at: Date.now(), kind: 'drop', text: `🎁 Tu as remporté le Drop de la semaine !` });
    this.save();
    return item;
  }

  async getChallenge(): Promise<SponsorChallenge> {
    await this.ready;
    return buildChallenge(this.season.endsAt);
  }

  async getChest(): Promise<RewardItem[]> {
    await this.ready;
    return this.chest;
  }

  async addToChest(item: RewardItem): Promise<void> {
    this.chest.unshift(item);
    this.save();
  }

  async resetDemo(): Promise<void> {
    this.engine?.stop();
    this.engine = null;
    await AsyncStorage.removeItem(STORE_KEY);
    this.seedFresh(Date.now());
    this.startEngine();
  }
}
