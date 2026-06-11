import {
  haversine,
  trackDistance,
  simplify,
  formatDuration,
  formatKm,
  formatPace,
  applyPrivacy,
  type GeoPoint,
} from './geo';

const p = (lat: number, lon: number, t = 0): GeoPoint => ({ lat, lon, t });

describe('haversine', () => {
  it('vaut 0 pour deux points identiques', () => {
    expect(haversine(p(48.9, 2.3), p(48.9, 2.3))).toBe(0);
  });

  it('≈ 111,2 km pour 1° de longitude à l’équateur', () => {
    expect(haversine(p(0, 0), p(0, 1))).toBeCloseTo(111195, -1); // ~111 km, tolérance 10 m
  });

  it('≈ 111,3 km pour 1° de latitude', () => {
    expect(haversine(p(0, 0), p(1, 0))).toBeCloseTo(111195, -1);
  });

  it('est symétrique', () => {
    const a = p(48.9105, 2.289);
    const b = p(48.92, 2.30);
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 9);
  });
});

describe('trackDistance', () => {
  it('vaut 0 pour 0 ou 1 point', () => {
    expect(trackDistance([])).toBe(0);
    expect(trackDistance([p(48.9, 2.3)])).toBe(0);
  });

  it('somme les segments successifs', () => {
    const pts = [p(0, 0), p(0, 1), p(0, 2)];
    expect(trackDistance(pts)).toBeCloseTo(haversine(pts[0], pts[1]) * 2, 6);
  });
});

describe('simplify (Douglas-Peucker)', () => {
  it('renvoie l’entrée telle quelle si ≤ 2 points', () => {
    const two = [p(0, 0), p(0, 1)];
    expect(simplify(two)).toBe(two);
  });

  it('réduit une ligne quasi droite à ses extrémités', () => {
    const line: GeoPoint[] = [];
    for (let i = 0; i <= 10; i++) line.push(p(i * 0.0001, 0)); // ~110 m, parfaitement aligné
    const out = simplify(line, 5);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual(line[0]);
    expect(out[1]).toEqual(line[line.length - 1]);
  });

  it('conserve un point qui dévie au-delà de la tolérance', () => {
    // pic latéral de ~200 m au milieu → doit être gardé
    const pts = [p(0, 0), p(0, 0.002), p(0, 0.004)];
    const spiked = [pts[0], p(0.002, 0.002), pts[2]];
    const out = simplify(spiked, 5);
    expect(out).toHaveLength(3);
  });
});

describe('formatDuration', () => {
  it('formate 0 ms', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });
  it('formate 1 h 2 min 3 s', () => {
    expect(formatDuration((3600 + 2 * 60 + 3) * 1000)).toBe('01:02:03');
  });
  it('tronque les millisecondes', () => {
    expect(formatDuration(59_999)).toBe('00:00:59');
  });
});

describe('formatKm', () => {
  it('formate avec une virgule et 2 décimales', () => {
    expect(formatKm(1234)).toBe('1,23');
    expect(formatKm(1000)).toBe('1,00');
    expect(formatKm(0)).toBe('0,00');
  });
});

describe('formatPace', () => {
  it('renvoie un tiret sous 20 m', () => {
    expect(formatPace(10, 60_000)).toBe('–:––');
  });
  it('calcule 5:00 /km pour 1 km en 5 min', () => {
    expect(formatPace(1000, 5 * 60_000)).toBe('5:00');
  });
  it('arrondit les secondes', () => {
    expect(formatPace(1000, 5.5 * 60_000)).toBe('5:30');
  });
  it('renvoie un tiret si l’allure dépasse 30 min/km', () => {
    expect(formatPace(1000, 40 * 60_000)).toBe('–:––');
  });
});

describe('applyPrivacy', () => {
  const seg = [p(0, 0), p(0, 0.0005), p(0, 0.001), p(0, 0.0015)];

  it('ne touche pas aux segments si la zone est nulle', () => {
    expect(applyPrivacy([seg], null)).toEqual([seg]);
  });

  it('coupe les points à l’intérieur de la zone', () => {
    // zone centrée sur le début, rayon ~80 m : retire les 2 premiers points
    const zone = { center: { lat: 0, lon: 0 }, radiusM: 80 };
    const out = applyPrivacy([seg], zone);
    // le segment restant ne contient que des points hors zone
    for (const s of out) for (const pt of s) {
      expect(haversine(pt, p(0, 0))).toBeGreaterThan(80);
    }
  });

  it('élimine entièrement un segment intégralement dans la zone', () => {
    const zone = { center: { lat: 0, lon: 0 }, radiusM: 1000 };
    expect(applyPrivacy([seg], zone)).toEqual([]);
  });
});
