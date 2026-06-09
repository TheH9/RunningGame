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

export function cellPolygon(h3: string): { lat: number; lon: number }[] {
  return cellToBoundary(h3).map(([lat, lon]) => ({ lat, lon }));
}

/** % de découverte perso (stat fog-of-war, ADR-003 §3) */
export function discoveryPercent(visited: Set<string>, cityCellCount: number): number {
  if (cityCellCount <= 0) return 0;
  return Math.min(100, Math.round((visited.size / cityCellCount) * 100));
}
