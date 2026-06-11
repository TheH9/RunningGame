// Territoire — agrégation H3 côté client (aperçu immédiat) ; le scoring
// officiel est fait côté serveur (fonction SQL score_run, ADR-002 §4).
// Rés. 11 ≈ 25 m de rayon — même résolution que le backend.

import { latLngToCell, cellToBoundary } from 'h3-js';
import type { GeoPoint } from './geo';
import type { TeamSlug } from '../theme/tokens';

export const H3_RES = 11;

export function trackToCells(points: GeoPoint[]): string[] {
  const set = new Set<string>();
  for (const p of points) set.add(latLngToCell(p.lat, p.lon, H3_RES));
  return [...set];
}

export type TerritoryCell = {
  h3: string;
  team: TeamSlug;
  /** 0..1 — force de contrôle, pilote l'opacité du hex (ADR-003) */
  strength: number;
  fading?: boolean;
};

// Contours H3 mis en cache : cellToBoundary est déterministe, mais coûteux et
// appelé pour chaque cellule à chaque rendu de la carte (zoom/pan). On évite de
// recalculer la même frontière des milliers de fois.
const _polyCache = new Map<string, { lat: number; lon: number }[]>();

export function cellPolygon(h3: string): { lat: number; lon: number }[] {
  let poly = _polyCache.get(h3);
  if (!poly) {
    poly = cellToBoundary(h3).map(([lat, lon]) => ({ lat, lon }));
    _polyCache.set(h3, poly);
  }
  return poly;
}

/** % de découverte perso (stat fog-of-war, ADR-003 §3) */
export function discoveryPercent(visited: Set<string>, cityCellCount: number): number {
  if (cityCellCount <= 0) return 0;
  return Math.min(100, Math.round((visited.size / cityCellCount) * 100));
}

// ----------------------------------------------------------------------------
// Règles de conflit (ADR-002) — fonctions pures, mêmes formules que le SQL.
// Les scores coexistent par (cellule, équipe) : rien n'est écrasé ; le
// propriétaire est l'équipe dominante ; écart < 30 % → « contesté ».
// ----------------------------------------------------------------------------

import type { CellScore } from '../backend/types';

export const SCORE_CAP = 12; // au-delà, la force de contrôle sature
export const FADE_AFTER_MS = 14 * 24 * 3600 * 1000;
export const NEUTRAL_AFTER_MS = 30 * 24 * 3600 * 1000;
export const CONTESTED_RATIO = 0.7;

export type CellView = {
  owner: TeamSlug | null;
  /** 0..1 — pilote l'opacité du rendu */
  strength: number;
  contested: boolean;
  /** équipe challenger si contesté */
  challenger: TeamSlug | null;
  fading: boolean;
  /** dernier coureur de l'équipe propriétaire (inspection au tap) */
  ownerPseudo: string | null;
  heldSinceMs: number; // depuis combien de temps l'équipe tient la cellule
};

export function cellView(c: CellScore, now: number): CellView {
  let owner: TeamSlug | null = null;
  let best = 0;
  let second: TeamSlug | null = null;
  let secondScore = 0;
  for (const [team, score] of Object.entries(c.scores) as [TeamSlug, number][]) {
    if (score > best) {
      second = owner;
      secondScore = best;
      owner = team;
      best = score;
    } else if (score > secondScore) {
      second = team;
      secondScore = score;
    }
  }
  if (!owner) {
    return { owner: null, strength: 0, contested: false, challenger: null, fading: false, ownerPseudo: null, heldSinceMs: 0 };
  }
  const last = c.lastPaint[owner] ?? 0;
  const age = now - last;
  if (age > NEUTRAL_AFTER_MS) {
    return { owner: null, strength: 0, contested: false, challenger: null, fading: false, ownerPseudo: null, heldSinceMs: 0 };
  }
  const fading = age > FADE_AFTER_MS;
  const contested = secondScore > 0 && secondScore / best > CONTESTED_RATIO;
  return {
    owner,
    strength: Math.min(1, best / SCORE_CAP) * (fading ? 0.5 : 1),
    contested,
    challenger: contested ? second : null,
    fading,
    ownerPseudo: c.lastRunner[owner] ?? null,
    heldSinceMs: age,
  };
}

export type CaptureDiff = {
  captured: string[];   // cellules prises à une autre équipe
  contested: string[];  // cellules devenues contestées (pas encore prises)
  reinforced: string[]; // cellules déjà à nous, renforcées
  discovered: string[]; // cellules neutres peintes
};

/** Applique un passage de `team` sur `h3s` — mute la map, renvoie le diff. */
export function paintCells(
  cells: Map<string, CellScore>,
  team: TeamSlug,
  runnerPseudo: string,
  h3s: string[],
  at: number,
): CaptureDiff {
  const diff: CaptureDiff = { captured: [], contested: [], reinforced: [], discovered: [] };
  for (const h3 of h3s) {
    const cell = cells.get(h3) ?? { h3, scores: {}, lastPaint: {}, lastRunner: {} };
    const before = cellView(cell, at);
    cell.scores[team] = Math.min(SCORE_CAP * 2, (cell.scores[team] ?? 0) + 1);
    cell.lastPaint[team] = at;
    cell.lastRunner[team] = runnerPseudo;
    cells.set(h3, cell);
    const after = cellView(cell, at);
    if (!before.owner) diff.discovered.push(h3);
    else if (before.owner === team) diff.reinforced.push(h3);
    else if (after.owner === team) diff.captured.push(h3);
    else if (after.contested && after.challenger === team) diff.contested.push(h3);
  }
  return diff;
}
