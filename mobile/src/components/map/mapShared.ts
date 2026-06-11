// Constantes, types et helpers partagés des calques carte.
// Système raster : monde en mètres autour de l'anchor → px canvas (PX_PER_M),
// canvas centré sur world(0,0) ; la caméra est un transform GPU sur la View.
// Le rendu natif (NativeMap) partage les mêmes constantes de LOD via la
// conversion échelle ↔ zoom Mapbox (zoomFromScale).

import type { PaintedTrail } from '../../backend/types';
import type { GeoPoint } from '../../lib/geo';
import type { CellView } from '../../lib/territory';
import type { LatLon, Projection } from '../../lib/world';
import { makeProjection } from '../../lib/world';
import type { TeamSlug } from '../../theme/tokens';

export const M_PER_PX = 2.2;
export const PX_PER_M = 1 / M_PER_PX;
/** côté du canvas SVG en px (couvre ±990 m) */
export const CANVAS = 900;
export const HALF = CANVAS / 2;

export const SCALE_MIN = 0.45;
export const SCALE_MAX = 2.5;
/** fondu croisé LOD : sous 0.55 → hexagones, au-dessus de 0.8 → veines */
export const LOD_LOW = 0.55;
export const LOD_HIGH = 0.8;

export type Pt = { x: number; y: number };

export type InspectInfo = {
  geo: LatLon;
  streetName: string;
  trail: PaintedTrail | null;
  cell: CellView;
};

export type MapProps = {
  dark?: boolean;
  team?: TeamSlug;
  /** trace du run en cours */
  trail?: GeoPoint[];
  /** gestes pinch/pan actifs */
  interactive?: boolean;
  /** caméra qui suit le coureur (run actif) */
  follow?: boolean;
  onInspect?: (info: InspectInfo) => void;
  initialScale?: number;
};

export function projectionFor(anchor: LatLon): Projection {
  return makeProjection(anchor, M_PER_PX);
}

/**
 * Échelle caméra raster → niveau de zoom Mapbox GL (tuiles 512 px) à cette
 * latitude. Permet au rendu natif de partager LOD et cadrage initial.
 */
export function zoomFromScale(scale: number, lat: number): number {
  const mPerPx = M_PER_PX / scale;
  return Math.log2((78271.517 * Math.cos((lat * Math.PI) / 180)) / mPerPx);
}

/** lissage Catmull-Rom → Bézier (héritée des maquettes validées) */
export function smooth(p: Pt[]): string {
  if (p.length < 2) return '';
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function polyline(p: Pt[]): string {
  if (p.length < 2) return '';
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 1; i < p.length; i++) d += ` L ${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)}`;
  return d;
}

export const MAP_LIGHT = {
  land: '#F3F0E9',
  blockRoof: '#EAE6DC',
  blockWall: '#D8D3C6',
  blockShadow: 'rgba(31,41,55,0.10)',
  blockEdge: '#F6F3ED',
  roadCase: '#D9D3C7',
  road: '#FFFFFF',
  water: '#BFE0F2',
  waterEdge: '#A5CFE8',
  park: '#CFE8C7',
  parkEdge: '#B7DBAA',
  label: '#7A7466',
};

export const MAP_DARK = {
  land: '#0E1116',
  blockRoof: '#161B24',
  blockWall: '#0B0E13',
  blockShadow: 'rgba(0,0,0,0.45)',
  blockEdge: '#1D2330',
  roadCase: '#070A0E',
  road: '#222932',
  water: '#0F2133',
  waterEdge: '#163049',
  park: '#10201A',
  parkEdge: '#18301F',
  label: '#7E8794',
};
