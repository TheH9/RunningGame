// Types du domaine — partagés par DemoBackend (mode fictif) et
// SupabaseBackend (prod). Les écrans ne connaissent que ces types.

import type { GeoPoint } from '../lib/geo';
import type { LatLon } from '../lib/world';
import type { TeamSlug } from '../theme/tokens';

export type SeasonInfo = {
  number: number;
  startsAt: number;
  endsAt: number;
  durationDays: number;
};

/** Scores coexistants par cellule H3 — le cœur du conflit territorial (ADR-002). */
export type CellScore = {
  h3: string;
  scores: Partial<Record<TeamSlug, number>>;
  lastPaint: Partial<Record<TeamSlug, number>>;
  /** dernier coureur à avoir peint la cellule (inspection tap) */
  lastRunner: Partial<Record<TeamSlug, string>>;
};

export type PaintedTrail = {
  id: string;
  team: TeamSlug;
  runnerPseudo: string;
  points: GeoPoint[];
  paintedAt: number;
};

export type Rival = {
  id: string;
  pseudo: string;
  team: TeamSlug;
  isFriend: boolean;
  emoji: string;
  weekPaintedM: number;
  totalPaintedM: number;
  runsPerWeek: number;
  /** rue fétiche (carte d'identité au tap) */
  signatureStreet: string;
  title: string | null; // « Baron du Centre-ville »…
};

export type Duel = {
  id: string;
  rivalId: string;
  startedAt: number;
  endsAt: number; // 7 jours
  myPaintedM: number;
  rivalPaintedM: number;
  status: 'active' | 'won' | 'lost';
};

export type Drop = {
  id: string;
  center: LatLon;
  radiusM: number;
  startsAt: number;
  endsAt: number;
  title: string;
  partner: string;
  emoji: string;
};

export type RewardItem = {
  id: string;
  title: string;
  partner: string;
  emoji: string;
  qrPayload: string;
  wonAt: number;
};

export type SponsorChallenge = {
  title: string;
  partner: string;
  description: string;
  prize: string;
  emoji: string;
  goalKm: number;
  endsAt: number;
};

export type FeedEvent = {
  id: string;
  at: number;
  kind: 'capture' | 'duel' | 'drop' | 'season' | 'record' | 'steal';
  text: string;
  team?: TeamSlug;
  actor?: string;
};

export type TeamScore = { team: TeamSlug; cells: number; percent: number };
export type RunnerScore = {
  pseudo: string;
  team: TeamSlug;
  paintedKm: number;
  isMe?: boolean;
  isFriend?: boolean;
};

export type RunSubmission = {
  segments: GeoPoint[][];
  distanceM: number;
  paintedM: number;
  elapsedMs: number;
  startedAt: number;
  seasonNumber: number;
};

export type RunResult = {
  paintedCells: string[];
  captured: string[];
  contested: string[];
  defended: string[];
};

export type LiveEvent =
  | { kind: 'bot-move'; botId: string; pseudo: string; team: TeamSlug; pos: LatLon; tail: LatLon[] }
  | { kind: 'bot-paint'; botId: string; team: TeamSlug; cells: string[]; trail: PaintedTrail }
  | { kind: 'feed'; event: FeedEvent };

export type SeasonRecap = {
  season: SeasonInfo;
  podium: TeamScore[];
  champion: { pseudo: string; team: TeamSlug; paintedKm: number };
  me: { paintedKm: number; cellsTaken: number; rank: number; runs: number };
};

export type TerritorySnapshot = {
  cells: CellScore[];
  trails: PaintedTrail[];
};
