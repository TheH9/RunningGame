// Seed du mode démo — un monde déjà vivant : 10 rivaux (dont 4 amis),
// ~40 traces réparties par équipe autour de leurs quartiers de départ,
// un drop hebdo, un feed crédible. Déterministe (seedé par saison).

import { simplify, type GeoPoint } from '../lib/geo';
import { trackToCells } from '../lib/territory';
import { getWorld, makeRng, type LatLon, type World } from '../lib/world';
import type { TeamSlug } from '../theme/tokens';
import { TEAMS } from '../theme/tokens';
import type {
  CellScore, Drop, FeedEvent, PaintedTrail, Rival, SponsorChallenge,
} from './types';
import { paintCells } from '../lib/territory';

export const RIVALS: Omit<Rival, 'weekPaintedM' | 'totalPaintedM'>[] = [
  { id: 'r1', pseudo: 'Maya', team: 'vagues', isFriend: true, emoji: '⚡', runsPerWeek: 4, signatureStreet: 'Rue de Paris', title: 'Baronne du Centre-ville' },
  { id: 'r2', pseudo: 'Karim', team: 'braises', isFriend: true, emoji: '🦊', runsPerWeek: 3, signatureStreet: 'Rue Gambetta', title: 'Gardien de la Gare' },
  { id: 'r3', pseudo: 'Léa', team: 'vagues', isFriend: true, emoji: '🌀', runsPerWeek: 5, signatureStreet: 'Avenue de la Marne', title: null },
  { id: 'r4', pseudo: 'Tom', team: 'soleils', isFriend: true, emoji: '🔆', runsPerWeek: 2, signatureStreet: 'Rue du Château', title: null },
  { id: 'r5', pseudo: 'Inès', team: 'pousses', isFriend: false, emoji: '🍀', runsPerWeek: 4, signatureStreet: 'Rue des Lilas', title: 'Reine du Parc' },
  { id: 'r6', pseudo: 'Diego', team: 'braises', isFriend: false, emoji: '🌶', runsPerWeek: 3, signatureStreet: 'Boulevard Voltaire', title: null },
  { id: 'r7', pseudo: 'Sofia', team: 'soleils', isFriend: false, emoji: '🌻', runsPerWeek: 3, signatureStreet: 'Rue de Colombes', title: null },
  { id: 'r8', pseudo: 'Hugo', team: 'vagues', isFriend: false, emoji: '🌊', runsPerWeek: 2, signatureStreet: 'Rue Denis-Papin', title: null },
  { id: 'r9', pseudo: 'Awa', team: 'pousses', isFriend: false, emoji: '🌿', runsPerWeek: 5, signatureStreet: 'Rue Victor-Hugo', title: null },
  { id: 'r10', pseudo: 'Nino', team: 'braises', isFriend: false, emoji: '🎯', runsPerWeek: 1, signatureStreet: 'Rue Émile-Zola', title: null },
];

// quartiers de départ par équipe (offsets en mètres autour de l'anchor)
const TEAM_HOME: Record<TeamSlug, { mx: number; my: number }> = {
  vagues: { mx: 180, my: -60 },
  braises: { mx: -320, my: -380 },
  soleils: { mx: 300, my: 420 },
  pousses: { mx: -380, my: 300 },
};

export type DemoSeedResult = {
  cells: Map<string, CellScore>;
  trails: PaintedTrail[];
  rivals: Rival[];
  feed: FeedEvent[];
};

export function buildSeed(anchor: LatLon, seasonNumber: number, now: number): DemoSeedResult {
  const world = getWorld(anchor);
  const rng = makeRng(7000 + seasonNumber * 97);
  const cells = new Map<string, CellScore>();
  const trails: PaintedTrail[] = [];
  const feed: FeedEvent[] = [];

  const rivals: Rival[] = RIVALS.map((r) => ({
    ...r,
    weekPaintedM: Math.round((2000 + rng() * 6000) * r.runsPerWeek) / 2,
    totalPaintedM: Math.round((8000 + rng() * 30000) * r.runsPerWeek),
  }));

  // ~40 traces : chaque rival a couru 3-5 fois près du QG de son équipe
  let trailId = 0;
  for (const r of rivals) {
    const home = TEAM_HOME[r.team];
    const nRuns = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < nRuns; i++) {
      const from = jitterGeo(world, home.mx + (rng() - 0.5) * 240, home.my + (rng() - 0.5) * 240);
      const route = world.randomRoute(rng, 1200 + rng() * 1800, from);
      if (route.length < 4) continue;
      const paintedAt = now - Math.floor(rng() * 12) * 24 * 3600 * 1000 - Math.floor(rng() * 20) * 3600 * 1000;
      const pts = simplify(route, 10);
      trails.push({ id: `seed-${trailId++}`, team: r.team, runnerPseudo: r.pseudo, points: pts, paintedAt });
      paintCells(cells, r.team, r.pseudo, trackToCells(pts), paintedAt);
    }
  }

  // feed initial
  const fmt = (r: Rival, d: string) => `${r.emoji} ${r.pseudo} ${d}`;
  const districts = world.districts;
  const mk = (i: number, kind: FeedEvent['kind'], text: string, team?: TeamSlug, actor?: string): FeedEvent => ({
    id: `seedfeed-${i}`, at: now - (i + 1) * 3 * 3600 * 1000, kind, text, team, actor,
  });
  feed.push(
    mk(0, 'capture', fmt(rivals[0], `a renforcé ${districts[0].name} pour ${TEAMS[rivals[0].team].name}`), rivals[0].team, rivals[0].pseudo),
    mk(1, 'steal', fmt(rivals[1], `a volé la ${rivals[1].signatureStreet} aux ${TEAMS.vagues.name} 🔥`), rivals[1].team, rivals[1].pseudo),
    mk(2, 'record', fmt(rivals[2], 'a battu son record : 8,2 km peints en un run'), rivals[2].team, rivals[2].pseudo),
    mk(3, 'capture', fmt(rivals[4], `étend ${districts[3].name} cellule par cellule`), rivals[4].team, rivals[4].pseudo),
    mk(4, 'season', `La Saison ${seasonNumber} est lancée — toute la ville est à reprendre !`),
  );

  return { cells, trails, rivals, feed };
}

function jitterGeo(world: World, mx: number, my: number): LatLon {
  const kLon = 111320 * Math.cos((world.anchor.lat * Math.PI) / 180);
  return { lat: world.anchor.lat - my / 110574, lon: world.anchor.lon + mx / kLon };
}

export function buildWeeklyDrop(anchor: LatLon, seasonNumber: number, now: number): Drop {
  const week = Math.floor(now / (7 * 24 * 3600 * 1000));
  const rng = makeRng(seasonNumber * 1000 + week);
  const world = getWorld(anchor);
  // posé sur une rue à 300-800 m de l'anchor
  const street = world.streets[Math.floor(rng() * world.streets.length)];
  const pt = street.pts[Math.floor(street.pts.length / 2 + (rng() - 0.5) * 4)];
  const weekStart = week * 7 * 24 * 3600 * 1000;
  return {
    id: `drop-s${seasonNumber}-w${week}`,
    center: { lat: pt.lat, lon: pt.lon },
    radiusM: 150,
    startsAt: weekStart,
    endsAt: weekStart + 7 * 24 * 3600 * 1000,
    title: 'Drop de la semaine',
    partner: 'Crock Sport · Asnières',
    emoji: '🎁',
  };
}

export function buildChallenge(seasonEndsAt: number): SponsorChallenge {
  return {
    title: 'Défi Crock Sport',
    partner: 'Crock Sport · Asnières Centre',
    description: 'Peins 25 km cette saison → tirage au sort parmi les finishers',
    prize: 'Une paire de running (valeur 140 €)',
    emoji: '👟',
    goalKm: 25,
    endsAt: seasonEndsAt,
  };
}

/** Faux points GPS d'un bot autour d'une route (utilisé par botEngine). */
export function botTrack(route: GeoPoint[]): GeoPoint[] {
  return simplify(route, 8);
}
