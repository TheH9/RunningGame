// MapCanvas — rendu carte du MVP (placeholder Mapbox).
// Porte le visuel validé des maquettes : ville procédurale + veines de
// territoire (zoom rue, ADR-003 §1) + trace comète + curseur flèche (ADR-002).
// Sera remplacé par @rnmapbox/maps (style custom) au lot « Carte vivante »,
// en gardant exactement ce langage visuel — les écrans n'ont pas à changer.

import React, { useMemo } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { GeoPoint } from '../lib/geo';
import { map as M, TEAMS, type TeamSlug } from '../theme/tokens';

const W = 390;
const H = 844;

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}

type Pt = { x: number; y: number };

function smooth(p: Pt[]): string {
  if (p.length < 2) return '';
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

const CLUSTERS: { cx: number; cy: number; r: number; team: TeamSlug }[] = [
  { cx: 255, cy: 430, r: 178, team: 'vagues' },
  { cx: 108, cy: 248, r: 120, team: 'braises' },
  { cx: 302, cy: 662, r: 120, team: 'soleils' },
  { cx: 74, cy: 612, r: 108, team: 'pousses' },
];

function regionAt(x: number, y: number) {
  let best: (typeof CLUSTERS)[number] | null = null;
  let bc = 0;
  for (const c of CLUSTERS) {
    const d = Math.hypot(x - c.cx, y - c.cy);
    if (d > c.r) continue;
    const cl = 1 - d / c.r;
    if (cl > bc) { bc = cl; best = c; }
  }
  return best ? { team: best.team, close: bc } : null;
}

type CityGeom = {
  blocks: { x: number; y: number; w: number; h: number }[];
  streets: Pt[][];
  veins: { d: string; color: string; haloOpacity: number; coreOpacity: number }[];
};

function buildCity(dark: boolean): CityGeom {
  const rnd = makeRng(913);
  const blocks: CityGeom['blocks'] = [];
  for (let gy = -1; gy < 14; gy++)
    for (let gx = -1; gx < 7; gx++) {
      if (rnd() < 0.2) continue;
      blocks.push({ x: gx * 62 + rnd() * 8 + 6, y: gy * 60 + rnd() * 8, w: 48 + rnd() * 12, h: 44 + rnd() * 12 });
    }
  const streets: Pt[][] = [];
  for (let r = -12; r <= 858; r += 60) {
    const amp = 7 + rnd() * 15, fq = 0.01 + rnd() * 0.012, ph = rnd() * 7;
    const pts: Pt[] = [];
    for (let x = -30; x <= 420; x += 46) pts.push({ x, y: r + Math.sin(x * fq + ph) * amp });
    streets.push(pts);
  }
  for (let c = -12; c <= 402; c += 56) {
    const amp = 7 + rnd() * 15, fq = 0.01 + rnd() * 0.012, ph = rnd() * 7;
    const pts: Pt[] = [];
    for (let y = -30; y <= 882; y += 46) pts.push({ x: c + Math.sin(y * fq + ph) * amp, y });
    streets.push(pts);
  }
  const veins: CityGeom['veins'] = [];
  for (const pts of streets) {
    const regs = pts.map((p) => regionAt(p.x, p.y));
    let i = 0;
    while (i < pts.length) {
      const r = regs[i];
      if (!r) { i++; continue; }
      let j = i;
      while (j + 1 < pts.length && regs[j + 1] && regs[j + 1]!.team === r.team) j++;
      if (j - i >= 1) {
        const sub = pts.slice(i, j + 1);
        let avg = 0;
        for (let k = i; k <= j; k++) avg += regs[k]!.close;
        avg /= j - i + 1;
        if (rnd() < 0.42 + 0.55 * avg) {
          veins.push({
            d: smooth(sub),
            color: TEAMS[r.team].color,
            haloOpacity: dark ? 0.16 + 0.36 * avg : 0.14,
            coreOpacity: dark ? 0.32 + 0.4 * avg : 0.9,
          });
        }
      }
      i = j + 1;
    }
  }
  return { blocks, streets, veins };
}

/** Projette la trace GPS en coordonnées écran, centrée sur le départ. */
function projectTrack(points: GeoPoint[]): Pt[] {
  if (points.length === 0) return [];
  const o = points[0];
  const k = Math.cos((o.lat * Math.PI) / 180);
  // ~2 px par mètre : un run de 200 m de rayon remplit l'écran
  const S = 2;
  return points.map((p) => ({
    x: 195 + (p.lon - o.lon) * 111320 * k * S,
    y: 470 - (p.lat - o.lat) * 110574 * S,
  }));
}

type Props = {
  dark?: boolean;
  /** trace GPS du run en cours (peinte en comète) */
  trail?: GeoPoint[];
  team?: TeamSlug;
};

export function MapCanvas({ dark = false, trail = [], team = 'vagues' }: Props) {
  const city = useMemo(() => buildCity(dark), [dark]);
  const teamColor = TEAMS[team].color;
  const screenTrail = useMemo(() => projectTrack(trail), [trail]);
  const trailD = screenTrail.length >= 2 ? smooth(screenTrail) : '';
  const head = screenTrail[screenTrail.length - 1];
  const prev = screenTrail[screenTrail.length - 2];
  const bearing = head && prev ? (Math.atan2(head.x - prev.x, prev.y - head.y) * 180) / Math.PI : -30;

  const C = dark
    ? { land: M.darkLand, block: M.darkBlock, roadCase: '#070A0E', road: M.darkRoad }
    : { land: M.land, block: M.block, roadCase: M.roadCase, road: M.road };

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Rect width={W} height={H} fill={C.land} />
      {city.blocks.map((b, i) => (
        <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={7} fill={C.block} />
      ))}
      {city.streets.map((pts, i) => (
        <Path key={`c${i}`} d={smooth(pts)} stroke={C.roadCase} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      ))}
      {city.streets.map((pts, i) => (
        <Path key={`r${i}`} d={smooth(pts)} stroke={C.road} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      ))}
      {city.veins.map((v, i) => (
        <G key={`v${i}`}>
          <Path d={v.d} stroke={v.color} strokeOpacity={v.haloOpacity} strokeWidth={dark ? 11 : 8} fill="none" strokeLinecap="round" />
          <Path d={v.d} stroke={v.color} strokeOpacity={v.coreOpacity} strokeWidth={dark ? 2.2 : 2.8} fill="none" strokeLinecap="round" />
        </G>
      ))}
      {trailD !== '' && (
        <G>
          <Path d={trailD} stroke={M.trailHalo} strokeOpacity={0.5} strokeWidth={13} fill="none" strokeLinecap="round" />
          <Path d={trailD} stroke={M.trailCore} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Path d={trailD} stroke="#EAF2FF" strokeOpacity={0.8} strokeWidth={1.6} strokeDasharray="1 8" fill="none" strokeLinecap="round" />
          <Circle cx={screenTrail[0].x} cy={screenTrail[0].y} r={4} fill={C.land} stroke={M.trailCore} strokeWidth={2.4} />
        </G>
      )}
      {head && (
        <G transform={`translate(${head.x} ${head.y}) rotate(${bearing})`}>
          <Circle r={26} fill={teamColor} opacity={0.18} />
          <Circle r={17} fill="#FFFFFF" />
          <Circle r={14} fill={teamColor} />
          <Path d="M0 -7 L5 6 L0 3 L-5 6 Z" fill="#FFFFFF" />
        </G>
      )}
    </Svg>
  );
}
