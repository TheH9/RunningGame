// Géométrie de trace — distance, simplification (ADR-002 §pipeline), formats.

export type GeoPoint = { lat: number; lon: number; t: number; accuracy?: number };

const R = 6371000;

export function haversine(a: GeoPoint, b: GeoPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function trackDistance(points: GeoPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i]);
  return d;
}

// Distance perpendiculaire approx. (équirectangulaire, suffisant à l'échelle d'un run)
function perpDistance(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const x = (lon: number, lat: number) => lon * Math.cos((lat * Math.PI) / 180);
  const ax = x(a.lon, a.lat), ay = a.lat;
  const bx = x(b.lon, b.lat), by = b.lat;
  const px = x(p.lon, p.lat), py = p.lat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const cx = ax + t * dx, cy = ay + t * dy;
  return haversine(p, { lat: cy, lon: cx / Math.cos((cy * Math.PI) / 180), t: 0 });
}

// Douglas-Peucker, tolérance en mètres (~5 m avant upload)
export function simplify(points: GeoPoint[], toleranceM = 5): GeoPoint[] {
  if (points.length <= 2) return points;
  let maxD = 0, idx = 0;
  const first = points[0], last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], first, last);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= toleranceM) return [first, last];
  const left = simplify(points.slice(0, idx + 1), toleranceM);
  const right = simplify(points.slice(idx), toleranceM);
  return [...left.slice(0, -1), ...right];
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

export function formatKm(m: number): string {
  return (m / 1000).toFixed(2).replace('.', ',');
}

/**
 * Privacy Zone : retire des segments publics les points dans la zone.
 * La trace publique « saute » la zone (nouveaux segments), comme côté serveur
 * (run_points.is_private). L'utilisateur voit tout, le public non.
 */
export function applyPrivacy(
  segments: GeoPoint[][],
  zone: { center: { lat: number; lon: number }; radiusM: number } | null,
): GeoPoint[][] {
  if (!zone) return segments;
  const c: GeoPoint = { lat: zone.center.lat, lon: zone.center.lon, t: 0 };
  const out: GeoPoint[][] = [];
  for (const seg of segments) {
    let current: GeoPoint[] = [];
    for (const p of seg) {
      if (haversine(p, c) <= zone.radiusM) {
        if (current.length >= 2) out.push(current);
        current = [];
      } else {
        current.push(p);
      }
    }
    if (current.length >= 2) out.push(current);
  }
  return out;
}

// min/km
export function formatPace(distanceM: number, elapsedMs: number): string {
  if (distanceM < 20) return '–:––';
  const minPerKm = elapsedMs / 60000 / (distanceM / 1000);
  if (!isFinite(minPerKm) || minPerKm > 30) return '–:––';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
