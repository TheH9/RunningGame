import {
  makeRng,
  makeProjection,
  buildWorld,
  getWorld,
  districtAt,
  DEFAULT_ANCHOR,
  type LatLon,
} from './world';

describe('makeRng', () => {
  it('est déterministe pour une même graine', () => {
    const a = makeRng(913);
    const b = makeRng(913);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produit des graines différentes pour des seeds différents', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  it('renvoie des valeurs dans [0, 1)', () => {
    const r = makeRng(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('makeProjection', () => {
  const proj = makeProjection(DEFAULT_ANCHOR, 2.2);

  it('projette l’anchor sur l’origine', () => {
    const o = proj.toXY(DEFAULT_ANCHOR);
    expect(o.x).toBeCloseTo(0, 9);
    expect(o.y).toBeCloseTo(0, 9);
  });

  it('fait un aller-retour toXY → toGeo sans perte', () => {
    const target: LatLon = { lat: 48.92, lon: 2.30 };
    const back = proj.toGeo(proj.toXY(target));
    expect(back.lat).toBeCloseTo(target.lat, 9);
    expect(back.lon).toBeCloseTo(target.lon, 9);
  });

  it('place le nord au-dessus (y négatif) et l’est à droite (x positif)', () => {
    const north = proj.toXY({ lat: DEFAULT_ANCHOR.lat + 0.01, lon: DEFAULT_ANCHOR.lon });
    const east = proj.toXY({ lat: DEFAULT_ANCHOR.lat, lon: DEFAULT_ANCHOR.lon + 0.01 });
    expect(north.y).toBeLessThan(0);
    expect(east.x).toBeGreaterThan(0);
  });
});

describe('buildWorld', () => {
  const world = buildWorld(DEFAULT_ANCHOR);

  it('génère des rues et 4 quartiers nommés', () => {
    expect(world.streets.length).toBeGreaterThan(0);
    expect(world.districts).toHaveLength(4);
    expect(world.streets[0].name).toBeTruthy();
  });

  it('est reproductible (même seed interne 913)', () => {
    const again = buildWorld(DEFAULT_ANCHOR);
    expect(again.streets.length).toBe(world.streets.length);
    expect(again.streets[0].pts[0]).toEqual(world.streets[0].pts[0]);
  });

  it('nearestStreet renvoie toujours une rue du monde', () => {
    const s = world.nearestStreet(DEFAULT_ANCHOR);
    expect(world.streets.some((st) => st.id === s.id)).toBe(true);
  });

  it('randomRoute produit une trace horodatée croissante', () => {
    const route = world.randomRoute(makeRng(7), 1500);
    expect(route.length).toBeGreaterThan(1);
    for (let i = 1; i < route.length; i++) {
      expect(route[i].t).toBeGreaterThan(route[i - 1].t);
      expect(typeof route[i].lat).toBe('number');
      expect(typeof route[i].lon).toBe('number');
    }
  });
});

describe('districtAt', () => {
  const world = buildWorld(DEFAULT_ANCHOR);

  it('reconnaît le centre d’un quartier', () => {
    const d = world.districts[0];
    expect(districtAt(world, d.center)?.name).toBe(d.name);
  });

  it('renvoie null très loin de la ville', () => {
    expect(districtAt(world, { lat: 0, lon: 0 })).toBeNull();
  });
});

describe('getWorld (singleton)', () => {
  it('réutilise la même instance pour le même anchor', () => {
    const a = getWorld(DEFAULT_ANCHOR);
    const b = getWorld(DEFAULT_ANCHOR);
    expect(a).toBe(b);
  });

  it('reconstruit le monde quand l’anchor change', () => {
    const a = getWorld(DEFAULT_ANCHOR);
    const c = getWorld({ lat: 45.75, lon: 4.85 }); // Lyon
    expect(c).not.toBe(a);
  });
});
