// Monde géoréférencé — fournit la projection ancre↔mètres partagée par toute
// la carte (makeProjection). La ville procédurale (seed 913) n'est conservée
// que pour les tests et les routes de replay : générée en MÈTRES autour d'un
// ancrage lat/lon réel puis convertie en GeoPoint, elle vit dans le même
// système de coordonnées que les traces GPS réelles et les cellules H3.

import type { GeoPoint } from './geo';

export type LatLon = { lat: number; lon: number };
export type XY = { x: number; y: number };

export const DEFAULT_ANCHOR: LatLon = { lat: 48.9105, lon: 2.289 }; // Asnières

const M_PER_DEG_LAT = 110574;
const mPerDegLon = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

/** Projection équirectangulaire centrée sur l'anchor. x→est, y→sud (px écran). */
export function makeProjection(anchor: LatLon, metersPerPx = 2.2) {
  // plancher anti-division-par-zéro : aux latitudes extrêmes cos(lat)→0,
  // ce qui ferait diverger toGeo (lon = …/kLon). Sans effet aux latitudes
  // habituelles (à 89,9994° kLon vaut encore ~1).
  const kLon = Math.max(1, mPerDegLon(anchor.lat));
  return {
    metersPerPx,
    toXY(p: LatLon): XY {
      return {
        x: ((p.lon - anchor.lon) * kLon) / metersPerPx,
        y: (-(p.lat - anchor.lat) * M_PER_DEG_LAT) / metersPerPx,
      };
    },
    toGeo(xy: XY): LatLon {
      return {
        lat: anchor.lat - (xy.y * metersPerPx) / M_PER_DEG_LAT,
        lon: anchor.lon + (xy.x * metersPerPx) / kLon,
      };
    },
  };
}

export type Projection = ReturnType<typeof makeProjection>;

export type Rng = () => number;
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}

export type Street = { id: string; name: string; pts: LatLon[] };
export type District = { name: string; center: LatLon; radiusM: number };
export type Block = { x: number; y: number; w: number; h: number; tall: number };

export type World = {
  anchor: LatLon;
  /** blocs en mètres relatifs à l'anchor (rendu fake-3D) */
  blocks: Block[];
  streets: Street[];
  districts: District[];
  parks: { cx: number; cy: number; r: number }[];
  riverY: number;
  nearestStreet(p: LatLon): Street;
  /** itinéraire aléatoire le long des rues (pour bots & replay) */
  randomRoute(rng: Rng, lengthM: number, from?: LatLon): GeoPoint[];
};

const STREET_NAMES = [
  'Rue des Lilas', 'Rue de Paris', 'Avenue de la Marne', 'Rue Gambetta',
  'Boulevard Voltaire', 'Rue des Bourguignons', 'Avenue Flachat', 'Rue du Château',
  'Rue Maurice-Bokanowski', 'Rue Denis-Papin', 'Rue de Colombes', 'Rue Pierre-Brossolette',
  'Rue Henri-Poincaré', 'Rue des Mourinoux', 'Avenue d’Argenteuil', 'Rue de Nanterre',
  'Rue Albert-Premier', 'Rue de la Station', 'Rue Robert-Lavergne', 'Rue Victor-Hugo',
  'Rue Jean-Jaurès', 'Rue des Écoles', 'Rue du Ménil', 'Rue de l’Abbé-Lemire',
  'Rue Camille-Pelletan', 'Rue de Bretagne', 'Rue des Peupliers', 'Rue Émile-Zola',
];

const DISTRICT_DEFS: { name: string; mx: number; my: number; r: number }[] = [
  { name: 'Centre-ville', mx: 120, my: -90, r: 420 },
  { name: 'Quartier Gare', mx: -260, my: -420, r: 320 },
  { name: 'Bords de Seine', mx: 240, my: 480, r: 320 },
  { name: 'Parc Robinson', mx: -360, my: 320, r: 280 },
];

// L'étendue du monde : ±900 m autour de l'anchor (assez pour des runs de 5-8 km)
const EXTENT_M = 900;
const GRID_M = 130; // espacement des rues (~130 m, échelle urbaine réaliste)

export function buildWorld(anchor: LatLon): World {
  const rnd = makeRng(913);
  const proj = makeProjection(anchor, 1); // ici 1 px = 1 m (tout en mètres)

  // blocs (en mètres)
  const blocks: Block[] = [];
  for (let gy = -7; gy < 7; gy++) {
    for (let gx = -7; gx < 7; gx++) {
      if (rnd() < 0.2) continue;
      blocks.push({
        x: gx * GRID_M + rnd() * 18 + 14,
        y: gy * GRID_M + rnd() * 18 + 14,
        w: 92 + rnd() * 26,
        h: 86 + rnd() * 26,
        tall: 0.5 + rnd() * 1.0, // facteur de hauteur fake-3D
      });
    }
  }

  // rues (sinusoïdes lissées, en mètres) — horizontales puis verticales
  const streets: Street[] = [];
  let nameIdx = 0;
  const mkStreet = (pts: XY[]): Street => {
    const id = `s${streets.length}`;
    const name = STREET_NAMES[nameIdx++ % STREET_NAMES.length];
    return { id, name, pts: pts.map((p) => proj.toGeo(p)) };
  };
  for (let r = -EXTENT_M; r <= EXTENT_M; r += GRID_M) {
    const amp = 14 + rnd() * 30, fq = 0.005 + rnd() * 0.006, ph = rnd() * 7;
    const pts: XY[] = [];
    for (let x = -EXTENT_M; x <= EXTENT_M; x += 90) pts.push({ x, y: r + Math.sin(x * fq + ph) * amp });
    streets.push(mkStreet(pts));
  }
  for (let c = -EXTENT_M; c <= EXTENT_M; c += GRID_M) {
    const amp = 14 + rnd() * 30, fq = 0.005 + rnd() * 0.006, ph = rnd() * 7;
    const pts: XY[] = [];
    for (let y = -EXTENT_M; y <= EXTENT_M; y += 90) pts.push({ x: c + Math.sin(y * fq + ph) * amp, y });
    streets.push(mkStreet(pts));
  }

  const districts: District[] = DISTRICT_DEFS.map((d) => ({
    name: d.name,
    center: proj.toGeo({ x: d.mx, y: d.my }),
    radiusM: d.r,
  }));

  const parks = [
    { cx: -360, cy: 320, r: 170 },
    { cx: 420, cy: -380, r: 130 },
  ];
  const riverY = 640; // bande d'eau au sud (en mètres)

  const streetXY = streets.map((s) => s.pts.map((p) => proj.toXY(p)));

  function nearestStreet(p: LatLon): Street {
    const q = proj.toXY(p);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < streetXY.length; i++) {
      for (const pt of streetXY[i]) {
        const d = (pt.x - q.x) ** 2 + (pt.y - q.y) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return streets[best];
  }

  // Graphe d'intersections : pour chaque point de rue, les bascules possibles
  // vers une autre rue à < 45 m (jamais de saut en diagonale à travers la ville).
  const crossings = new Map<string, { street: number; pt: number }[]>();
  {
    const CROSS_M = 45;
    for (let a = 0; a < streetXY.length; a++) {
      for (let b = a + 1; b < streetXY.length; b++) {
        let bestD = CROSS_M, bi = -1, bj = -1;
        for (let i = 0; i < streetXY[a].length; i += 1) {
          for (let j = 0; j < streetXY[b].length; j += 1) {
            const d = Math.hypot(streetXY[a][i].x - streetXY[b][j].x, streetXY[a][i].y - streetXY[b][j].y);
            if (d < bestD) { bestD = d; bi = i; bj = j; }
          }
        }
        if (bi >= 0) {
          const ka = `${a}:${bi}`, kb = `${b}:${bj}`;
          if (!crossings.has(ka)) crossings.set(ka, []);
          if (!crossings.has(kb)) crossings.set(kb, []);
          crossings.get(ka)!.push({ street: b, pt: bj });
          crossings.get(kb)!.push({ street: a, pt: bi });
        }
      }
    }
  }

  // Itinéraire réaliste : suit une rue, tourne UNIQUEMENT aux croisements.
  function randomRoute(rng2: Rng, lengthM: number, from?: LatLon): GeoPoint[] {
    const start: XY = from
      ? proj.toXY(from)
      : { x: (rng2() - 0.5) * EXTENT_M * 1.2, y: (rng2() - 0.5) * EXTENT_M * 1.2 };
    const out: XY[] = [];
    let streetIdx = nearestIdx(start);
    let ptIdx = nearestPtIdx(streetIdx, start);
    let dir = rng2() < 0.5 ? 1 : -1;
    let cur = streetXY[streetIdx][ptIdx];
    out.push(cur);
    let dist = 0;
    let guard = 0;
    while (dist < lengthM && guard++ < 400) {
      const pts = streetXY[streetIdx];
      const nextIdx = ptIdx + dir;
      const turns = crossings.get(`${streetIdx}:${ptIdx}`);
      const mustTurn = nextIdx < 0 || nextIdx >= pts.length;
      if ((mustTurn || rng2() < 0.3) && turns && turns.length > 0) {
        // tourne au croisement
        const turn = turns[Math.floor(rng2() * turns.length)];
        streetIdx = turn.street;
        ptIdx = turn.pt;
        dir = rng2() < 0.5 ? 1 : -1;
        const p = streetXY[streetIdx][ptIdx];
        dist += Math.hypot(p.x - cur.x, p.y - cur.y);
        cur = p;
        out.push(cur);
        continue;
      }
      if (mustTurn) break; // cul-de-sac sans croisement : fin de course
      ptIdx = nextIdx;
      const next = pts[ptIdx];
      dist += Math.hypot(next.x - cur.x, next.y - cur.y);
      cur = next;
      out.push(cur);
    }
    const t0 = Date.now();
    return out.map((p, i) => ({ ...proj.toGeo(p), t: t0 + i * 1000 }));
  }

  function nearestIdx(q: XY): number {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < streetXY.length; i++) {
      for (const pt of streetXY[i]) {
        const d = (pt.x - q.x) ** 2 + (pt.y - q.y) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return best;
  }
  function nearestPtIdx(si: number, q: XY): number {
    let best = 0, bestD = Infinity;
    const pts = streetXY[si];
    for (let i = 0; i < pts.length; i++) {
      const d = (pts[i].x - q.x) ** 2 + (pts[i].y - q.y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  return { anchor, blocks, streets, districts, parks, riverY, nearestStreet, randomRoute };
}

// --- singleton du monde (reconstruit si l'anchor change) ---
let cached: World | null = null;
export function getWorld(anchor: LatLon = DEFAULT_ANCHOR): World {
  if (!cached || Math.abs(cached.anchor.lat - anchor.lat) > 1e-6 || Math.abs(cached.anchor.lon - anchor.lon) > 1e-6) {
    cached = buildWorld(anchor);
  }
  return cached;
}

export function districtAt(world: World, p: LatLon): District | null {
  const proj = makeProjection(world.anchor, 1);
  const q = proj.toXY(p);
  for (const d of world.districts) {
    const c = proj.toXY(d.center);
    if (Math.hypot(c.x - q.x, c.y - q.y) <= d.radiusM) return d;
  }
  return null;
}
