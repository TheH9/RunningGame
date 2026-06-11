import {
  trackToCells,
  cellPolygon,
  discoveryPercent,
  cellView,
  paintCells,
  SCORE_CAP,
  FADE_AFTER_MS,
  NEUTRAL_AFTER_MS,
} from './territory';
import type { CellScore } from '../backend/types';
import type { GeoPoint } from './geo';
import type { TeamSlug } from '../theme/tokens';

const p = (lat: number, lon: number, t = 0): GeoPoint => ({ lat, lon, t });

const cell = (
  scores: Partial<Record<TeamSlug, number>>,
  ages: Partial<Record<TeamSlug, number>> = {},
  now = 0,
): CellScore => {
  const lastPaint: Partial<Record<TeamSlug, number>> = {};
  const lastRunner: Partial<Record<TeamSlug, string>> = {};
  for (const team of Object.keys(scores) as TeamSlug[]) {
    lastPaint[team] = now - (ages[team] ?? 0); // par défaut peint « maintenant »
    lastRunner[team] = `${team}-runner`;
  }
  return { h3: 'h', scores, lastPaint, lastRunner };
};

describe('trackToCells', () => {
  it('déduplique les points d’une même cellule', () => {
    expect(trackToCells([p(48.9105, 2.289), p(48.9105, 2.289)])).toHaveLength(1);
  });

  it('renvoie plusieurs cellules pour des points éloignés', () => {
    const cells = trackToCells([p(48.9105, 2.289), p(48.95, 2.35)]);
    expect(cells.length).toBeGreaterThan(1);
  });

  it('renvoie un tableau vide pour aucun point', () => {
    expect(trackToCells([])).toEqual([]);
  });
});

describe('cellPolygon', () => {
  it('renvoie un polygone fermé de sommets {lat, lon}', () => {
    const [h3] = trackToCells([p(48.9105, 2.289)]);
    const poly = cellPolygon(h3);
    expect(poly.length).toBeGreaterThanOrEqual(5); // hexagone (parfois pentagone)
    for (const v of poly) {
      expect(typeof v.lat).toBe('number');
      expect(typeof v.lon).toBe('number');
    }
  });
});

describe('discoveryPercent', () => {
  it('vaut 0 si la ville n’a aucune cellule', () => {
    expect(discoveryPercent(new Set(['a', 'b']), 0)).toBe(0);
  });
  it('arrondit le pourcentage', () => {
    expect(discoveryPercent(new Set(['a']), 3)).toBe(33);
  });
  it('plafonne à 100', () => {
    expect(discoveryPercent(new Set(['a', 'b', 'c']), 2)).toBe(100);
  });
});

describe('cellView', () => {
  it('renvoie un propriétaire nul pour une cellule vide', () => {
    expect(cellView(cell({}), 0).owner).toBeNull();
  });

  it('désigne l’équipe dominante et calcule la force ∝ score/cap', () => {
    const v = cellView(cell({ vagues: 6 }), 0);
    expect(v.owner).toBe('vagues');
    expect(v.strength).toBeCloseTo(6 / SCORE_CAP, 6);
    expect(v.contested).toBe(false);
    expect(v.ownerPseudo).toBe('vagues-runner');
  });

  it('sature la force à 1 au-delà du cap', () => {
    expect(cellView(cell({ vagues: SCORE_CAP * 2 }), 0).strength).toBe(1);
  });

  it('marque « contesté » quand le second dépasse 70 % du leader', () => {
    const v = cellView(cell({ vagues: 10, braises: 8 }), 0);
    expect(v.owner).toBe('vagues');
    expect(v.contested).toBe(true);
    expect(v.challenger).toBe('braises');
  });

  it('n’est pas contesté quand le second est sous 70 %', () => {
    expect(cellView(cell({ vagues: 10, braises: 6 }), 0).contested).toBe(false);
  });

  it('passe en fading après 14 jours (force ÷ 2)', () => {
    const now = NEUTRAL_AFTER_MS; // base de temps confortable
    const v = cellView(cell({ vagues: 6 }, { vagues: FADE_AFTER_MS + 1000 }, now), now);
    expect(v.fading).toBe(true);
    expect(v.strength).toBeCloseTo((6 / SCORE_CAP) * 0.5, 6);
  });

  it('redevient neutre après 30 jours', () => {
    const now = 2 * NEUTRAL_AFTER_MS;
    const v = cellView(cell({ vagues: 9 }, { vagues: NEUTRAL_AFTER_MS + 1000 }, now), now);
    expect(v.owner).toBeNull();
    expect(v.strength).toBe(0);
  });
});

describe('paintCells', () => {
  it('marque une cellule neutre comme « découverte » et l’attribue', () => {
    const map = new Map<string, CellScore>();
    const diff = paintCells(map, 'vagues', 'moi', ['h1'], 1000);
    expect(diff.discovered).toEqual(['h1']);
    expect(cellView(map.get('h1')!, 1000).owner).toBe('vagues');
  });

  it('« renforce » une cellule déjà détenue par l’équipe', () => {
    const map = new Map<string, CellScore>([['h1', cell({ vagues: 3 }, {}, 1000)]]);
    const diff = paintCells(map, 'vagues', 'moi', ['h1'], 1000);
    expect(diff.reinforced).toEqual(['h1']);
    expect(map.get('h1')!.scores.vagues).toBe(4);
  });

  it('« capture » une cellule en dépassant l’adversaire', () => {
    const map = new Map<string, CellScore>([['h1', cell({ braises: 1, vagues: 1 }, {}, 1000)]]);
    const diff = paintCells(map, 'vagues', 'moi', ['h1'], 1000);
    expect(diff.captured).toEqual(['h1']);
    expect(cellView(map.get('h1')!, 1000).owner).toBe('vagues');
  });

  it('« conteste » sans prendre quand l’adversaire reste devant', () => {
    // un seul passage met à égalité (1 vs 1) : l’adversaire garde la cellule
    // (il était là avant), mais elle bascule en « contestée ».
    const map = new Map<string, CellScore>([['h1', cell({ braises: 1 }, {}, 1000)]]);
    const diff = paintCells(map, 'vagues', 'moi', ['h1'], 1000);
    expect(diff.contested).toEqual(['h1']);
    const v = cellView(map.get('h1')!, 1000);
    expect(v.owner).toBe('braises');
    expect(v.contested).toBe(true);
    expect(v.challenger).toBe('vagues');
  });

  it('ne prend pas une cellule où l’adversaire garde une nette avance', () => {
    const map = new Map<string, CellScore>([['h1', cell({ braises: 5 }, {}, 1000)]]);
    const diff = paintCells(map, 'vagues', 'moi', ['h1'], 1000);
    expect(diff).toEqual({ captured: [], contested: [], reinforced: [], discovered: [] });
    expect(cellView(map.get('h1')!, 1000).owner).toBe('braises');
  });

  it('plafonne le score accumulé à 2× le cap', () => {
    const map = new Map<string, CellScore>([['h1', cell({ vagues: SCORE_CAP * 2 }, {}, 1000)]]);
    paintCells(map, 'vagues', 'moi', ['h1'], 1000);
    expect(map.get('h1')!.scores.vagues).toBe(SCORE_CAP * 2);
  });
});
