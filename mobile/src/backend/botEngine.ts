// Moteur de rivaux — fait vivre la carte : 2 à 4 bots courent en même temps,
// avancent à ~11 km/h sur les rues du monde, et « déposent » leur peinture
// par tronçons (~20 s). Tourne uniquement quand l'app est au premier plan.

import { AppState, type AppStateStatus } from 'react-native';
import { simplify, type GeoPoint } from '../lib/geo';
import { trackToCells } from '../lib/territory';
import { getWorld, makeRng, type LatLon, type Rng } from '../lib/world';
import type { LiveEvent, PaintedTrail, Rival } from './types';

const TICK_MS = 1500;
const PAINT_EVERY_MS = 20000;
const SPEED_M_PER_TICK = (11 * 1000 / 3600) * (TICK_MS / 1000); // ~4,6 m / tick

type ActiveBot = {
  rival: Rival;
  route: GeoPoint[];
  idx: number;
  along: number;
  history: GeoPoint[]; // depuis le dernier dépôt de peinture
  lastPaintAt: number;
};

export class BotEngine {
  private bots: ActiveBot[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove(): void } | null = null;
  private rng: Rng;

  constructor(
    private anchor: LatLon,
    private rivals: Rival[],
    private emit: (e: LiveEvent) => void,
    seed = Date.now() % 100000,
  ) {
    this.rng = makeRng(seed);
  }

  start() {
    this.stop();
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.appStateSub = AppState.addEventListener('change', (st: AppStateStatus) => {
      if (st === 'active') {
        if (!this.timer) this.timer = setInterval(() => this.tick(), TICK_MS);
      } else {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
      }
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.appStateSub?.remove();
    this.appStateSub = null;
  }

  private spawnBot() {
    const candidates = this.rivals.filter((r) => !this.bots.some((b) => b.rival.id === r.id));
    if (candidates.length === 0) return;
    const rival = candidates[Math.floor(this.rng() * candidates.length)];
    const world = getWorld(this.anchor);
    const route = world.randomRoute(this.rng, 1500 + this.rng() * 2000);
    if (route.length < 4) return;
    this.bots.push({ rival, route, idx: 0, along: 0, history: [route[0]], lastPaintAt: Date.now() });
  }

  private tick() {
    // maintien de 2-4 bots actifs
    const target = 2 + Math.floor(this.rng() * 3);
    while (this.bots.length < target) this.spawnBot();

    const now = Date.now();
    for (let i = this.bots.length - 1; i >= 0; i--) {
      const bot = this.bots[i];
      const pos = advance(bot, SPEED_M_PER_TICK);
      if (!pos) {
        // fin de course : dépose le reste de la peinture et sort
        this.flushPaint(bot, now);
        this.bots.splice(i, 1);
        continue;
      }
      bot.history.push({ ...pos, t: now });
      this.emit({
        kind: 'bot-move',
        botId: bot.rival.id,
        pseudo: bot.rival.pseudo,
        team: bot.rival.team,
        pos,
        tail: bot.history.slice(-8),
      });
      if (now - bot.lastPaintAt >= PAINT_EVERY_MS && bot.history.length >= 3) {
        this.flushPaint(bot, now);
      }
    }
  }

  private flushPaint(bot: ActiveBot, now: number) {
    if (bot.history.length < 2) return;
    const pts = simplify(bot.history, 8);
    const trail: PaintedTrail = {
      id: `live-${bot.rival.id}-${now}`,
      team: bot.rival.team,
      runnerPseudo: bot.rival.pseudo,
      points: pts,
      paintedAt: now,
    };
    this.emit({ kind: 'bot-paint', botId: bot.rival.id, team: bot.rival.team, cells: trackToCells(pts), trail });
    bot.history = [bot.history[bot.history.length - 1]];
    bot.lastPaintAt = now;
  }
}

function advance(bot: ActiveBot, meters: number): LatLon | null {
  const { route } = bot;
  if (bot.idx >= route.length - 1) return null;
  let budget = meters;
  let segLen = dist(route[bot.idx], route[bot.idx + 1]);
  while (bot.along + budget >= segLen) {
    budget -= segLen - bot.along;
    bot.along = 0;
    bot.idx++;
    if (bot.idx >= route.length - 1) return null;
    segLen = dist(route[bot.idx], route[bot.idx + 1]);
  }
  bot.along += budget;
  const a = route[bot.idx], b = route[bot.idx + 1];
  const f = segLen > 0 ? bot.along / segLen : 1;
  return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
}

function dist(a: LatLon, b: LatLon): number {
  const kLon = 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((b.lat - a.lat) * 110574, (b.lon - a.lon) * kLon);
}
