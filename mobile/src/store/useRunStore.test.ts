// Test d'INTÉGRATION du moteur de run : on remplace la source GPS par un faux
// émetteur contrôlable et on pousse des points fabriqués → on vérifie la VRAIE
// logique onFix/stop (distance, segments, anti-triche, Privacy Zone) sans device.

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}));

// Faux LocationSource : capture le callback onPoint dans un holder lisible côté test.
jest.mock('../lib/locationSource', () => {
  const holder: { cb: ((p: any) => void) | null } = { cb: null };
  class Fake {
    kind = 'gps' as const;
    async start(onPoint: (p: any) => void) { holder.cb = onPoint; return true; }
    stop() {}
  }
  return { GpsSource: Fake, ReplaySource: Fake, __holder: holder };
});

import { useRunStore } from './useRunStore';
import { useAppStore } from './useAppStore';
import * as locSrc from '../lib/locationSource';
import type { GeoPoint } from '../lib/geo';

const M_PER_DEG_LAT = 110574;
const emit = (p: GeoPoint) => (locSrc as any).__holder.cb(p);

/** Démarre un run GPS et renvoie l'émetteur de points (callback capturé). */
async function startRun() {
  await useRunStore.getState().start({ replay: false });
}

/** Fabrique un point à `stepM` mètres au nord du précédent, `dtS` s plus tard. */
function lineRun(opts: { n: number; stepM: number; dtS: number; acc?: number; lat0?: number; lon0?: number }) {
  const { n, stepM, dtS, acc = 5, lat0 = 48.91, lon0 = 2.289 } = opts;
  for (let i = 0; i < n; i++) {
    emit({ lat: lat0 + (i * stepM) / M_PER_DEG_LAT, lon: lon0, t: 1000 + i * dtS * 1000, accuracy: acc });
  }
}

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  useAppStore.setState({ worldAnchor: null, privacyZone: null });
});
afterEach(() => {
  useRunStore.getState().discard(); // coupe timer + source, repasse idle
  jest.clearAllTimers();
});

describe('trace propre', () => {
  it('accumule la distance et compte les points', async () => {
    await startRun();
    lineRun({ n: 20, stepM: 8, dtS: 2 }); // ~14 km/h, propre
    const s = useRunStore.getState();
    expect(s.status).toBe('running');
    expect(s.pointCount).toBe(20);
    // 19 pas de ~8 m ; tolérance 3 % (R sphérique vs m/deg)
    expect(Math.abs(s.distanceM - 19 * 8)).toBeLessThan(19 * 8 * 0.03);
    expect(s.tooFastNow).toBe(false);
    expect(s.invalidated).toBe(false);
  });

  it('ancre le monde démo sur le premier fix réel', async () => {
    await startRun();
    lineRun({ n: 1, stepM: 8, dtS: 2, lat0: 45.5, lon0: 4.0 });
    expect(useAppStore.getState().worldAnchor).toEqual({ lat: 45.5, lon: 4.0 });
  });
});

describe('filtrage & segments', () => {
  it('ignore les points trop imprécis (accuracy > 30 m)', async () => {
    await startRun();
    emit({ lat: 48.91, lon: 2.289, t: 1000, accuracy: 5 });
    emit({ lat: 48.911, lon: 2.289, t: 3000, accuracy: 50 }); // rejeté
    expect(useRunStore.getState().pointCount).toBe(1);
    emit({ lat: 48.9101, lon: 2.289, t: 5000, accuracy: 5 });
    expect(useRunStore.getState().pointCount).toBe(2);
  });

  it('ouvre un nouveau segment sur un trou GPS (> 100 m) sans compter le saut', async () => {
    await startRun();
    lineRun({ n: 3, stepM: 8, dtS: 2 }); // 1 segment, ~16 m
    // saut de ~200 m
    emit({ lat: 48.91 + (2 * 8 + 200) / M_PER_DEG_LAT, lon: 2.289, t: 1000 + 3 * 2000, accuracy: 5 });
    const s = useRunStore.getState();
    expect(s.segments).toHaveLength(2);
    expect(Math.abs(s.distanceM - 2 * 8)).toBeLessThan(2 * 8 * 0.05); // le saut n'est pas compté
  });
});

describe('anti-triche', () => {
  it('suspend la peinture au-dessus de 25 km/h soutenu', async () => {
    await startRun();
    lineRun({ n: 7, stepM: 20, dtS: 1 }); // ~72 km/h
    const s = useRunStore.getState();
    expect(s.tooFastNow).toBe(true);
    expect(s.flaggedM).toBeGreaterThan(0);
    expect(s.invalidated).toBe(false); // suspension, pas invalidation
  });

  it('invalide un run au-dessus de 40 km/h pendant plus d’une minute', async () => {
    await startRun();
    lineRun({ n: 35, stepM: 40, dtS: 3 }); // ~48 km/h sur ~100 s
    expect(useRunStore.getState().invalidated).toBe(true);
    const summary = useRunStore.getState().stop();
    expect(summary.invalidated).toBe(true);
    expect(summary.cells).toEqual([]); // run invalidé → aucune cellule soumise
  });
});

describe('stop()', () => {
  it('marque tooShort sous 100 m', async () => {
    await startRun();
    lineRun({ n: 5, stepM: 8, dtS: 2 }); // ~32 m
    const summary = useRunStore.getState().stop();
    expect(summary.tooShort).toBe(true);
    expect(useRunStore.getState().status).toBe('finished');
  });

  it('produit des cellules H3 pour un run valide', async () => {
    await startRun();
    lineRun({ n: 20, stepM: 8, dtS: 2 });
    const summary = useRunStore.getState().stop();
    expect(summary.tooShort).toBe(false);
    expect(summary.cells.length).toBeGreaterThan(0);
  });

  it('applique la Privacy Zone : la trace publique saute la zone', async () => {
    useAppStore.setState({ privacyZone: { center: { lat: 48.91, lon: 2.289 }, radiusM: 5000 } });
    await startRun();
    lineRun({ n: 20, stepM: 8, dtS: 2 }); // tout le run est dans la zone
    const summary = useRunStore.getState().stop();
    expect(summary.paintedM).toBeLessThan(summary.distanceM); // peinture publique amputée
    expect(summary.paintedM).toBeCloseTo(0, 0); // ~0 : tout est privé
  });
});
