// Store profil/stats — logique pure (records, cumuls, découverte). AsyncStorage
// (persist) est mocké en mémoire ; aucune dépendance native réelle.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: async (k: string, v: string) => { store.set(k, v); },
      removeItem: async (k: string) => { store.delete(k); },
    },
  };
});

import { useAppStore } from './useAppStore';

beforeEach(() => useAppStore.getState().resetAll());

describe('recordRun', () => {
  it('cumule runs, distance et peinture (saison incluse)', () => {
    useAppStore.getState().recordRun(2000, 1500, ['a', 'b'], 600_000);
    const s = useAppStore.getState();
    expect(s.totalRuns).toBe(1);
    expect(s.totalDistanceM).toBe(2000);
    expect(s.totalPaintedM).toBe(1500);
    expect(s.seasonPaintedM).toBe(1500);
  });

  it('déduplique les cellules découvertes au fil des runs', () => {
    useAppStore.getState().recordRun(2000, 1500, ['a', 'b'], 600_000);
    useAppStore.getState().recordRun(2000, 1500, ['b', 'c'], 600_000);
    expect(new Set(useAppStore.getState().discoveredCells)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('enregistre un record d’allure seulement au-delà de 1 km', () => {
    useAppStore.getState().recordRun(500, 400, [], 180_000); // < 1 km
    expect(useAppStore.getState().bestRun).toBeNull();
    useAppStore.getState().recordRun(2000, 1500, [], 600_000); // 5:00 /km
    expect(useAppStore.getState().bestRun).toEqual({ distanceM: 2000, paceMinKm: 5 });
  });

  it('ne garde que la meilleure allure', () => {
    useAppStore.getState().recordRun(2000, 1500, [], 600_000); // 5:00 /km
    useAppStore.getState().recordRun(1500, 1000, [], 540_000); // 6:00 /km, plus lent
    expect(useAppStore.getState().bestRun).toEqual({ distanceM: 2000, paceMinKm: 5 });
    useAppStore.getState().recordRun(3000, 2000, [], 720_000); // 4:00 /km, plus rapide
    expect(useAppStore.getState().bestRun?.paceMinKm).toBe(4);
  });
});

describe('saison & reset', () => {
  it('resetSeasonStats remet la peinture de saison à zéro sans toucher aux cumuls', () => {
    useAppStore.getState().recordRun(2000, 1500, ['a'], 600_000);
    useAppStore.getState().resetSeasonStats();
    const s = useAppStore.getState();
    expect(s.seasonPaintedM).toBe(0);
    expect(s.totalPaintedM).toBe(1500); // cumul intact
  });

  it('resetAll revient à l’état initial', () => {
    const a = useAppStore.getState();
    a.setPseudo('Hugo');
    a.chooseTeam('braises');
    a.completeOnboarding();
    a.recordRun(2000, 1500, ['a'], 600_000);
    a.resetAll();
    const s = useAppStore.getState();
    expect(s.pseudo).toBeNull();
    expect(s.team).toBeNull();
    expect(s.onboarded).toBe(false);
    expect(s.totalRuns).toBe(0);
  });
});

describe('profil', () => {
  it('mémorise pseudo et équipe', () => {
    useAppStore.getState().setPseudo('Hugo');
    useAppStore.getState().chooseTeam('pousses');
    expect(useAppStore.getState().pseudo).toBe('Hugo');
    expect(useAppStore.getState().team).toBe('pousses');
  });
});
