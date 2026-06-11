// Store territoire — application des runs (moi + bots live) sur la carte de
// cellules. Pas de backend requis : on teste applyMyRun / applyLive / ownerOf,
// qui n'appellent jamais getBackend().
import { useTerritoryStore } from './useTerritoryStore';
import type { LiveEvent, PaintedTrail } from '../backend/types';
import type { TeamSlug } from '../theme/tokens';

const trail = (team: TeamSlug, id = 't'): PaintedTrail => ({
  id, team, runnerPseudo: `${team}-runner`, points: [], paintedAt: Date.now(),
});

beforeEach(() =>
  useTerritoryStore.setState({
    hydrated: false, version: 0, botsVersion: 0,
    cells: new Map(), trails: [], bots: new Map(),
  }),
);

describe('applyMyRun', () => {
  it('peint mes cellules, ajoute la trace et bump la version de rendu', () => {
    const st = useTerritoryStore.getState();
    st.applyMyRun('vagues', 'moi', ['h1', 'h2'], trail('vagues'));
    const s = useTerritoryStore.getState();
    expect(s.version).toBe(1);
    expect(s.trails).toHaveLength(1);
    expect(s.ownerOf('h1').owner).toBe('vagues');
    expect(s.ownerOf('h2').owner).toBe('vagues');
  });

  it('borne la mémoire des traces à 150 entrées', () => {
    for (let i = 0; i < 160; i++) {
      useTerritoryStore.getState().applyMyRun('vagues', 'moi', ['h'], trail('vagues', `t${i}`));
    }
    expect(useTerritoryStore.getState().trails.length).toBeLessThanOrEqual(150);
  });
});

describe('ownerOf', () => {
  it('renvoie un propriétaire nul pour une cellule inconnue', () => {
    expect(useTerritoryStore.getState().ownerOf('inconnue').owner).toBeNull();
  });
});

describe('applyLive', () => {
  it('bot-paint peint la carte et bump la version (re-rendu des veines)', () => {
    const e: LiveEvent = {
      kind: 'bot-paint', botId: 'b1', team: 'braises',
      cells: ['h9'], trail: trail('braises', 'live'),
    };
    useTerritoryStore.getState().applyLive(e);
    const s = useTerritoryStore.getState();
    expect(s.version).toBe(1);
    expect(s.ownerOf('h9').owner).toBe('braises');
    expect(s.trails).toHaveLength(1);
  });

  it('bot-move met à jour la position SANS re-rendre les veines (perf)', () => {
    const before = useTerritoryStore.getState().version;
    const e: LiveEvent = {
      kind: 'bot-move', botId: 'b1', pseudo: 'Rival', team: 'soleils',
      pos: { lat: 48.9, lon: 2.3 }, tail: [],
    };
    useTerritoryStore.getState().applyLive(e);
    const s = useTerritoryStore.getState();
    expect(s.bots.get('b1')?.team).toBe('soleils');
    expect(s.botsVersion).toBe(1);
    expect(s.version).toBe(before); // version « lourde » inchangée
  });
});
