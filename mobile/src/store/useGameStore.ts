// Couche de jeu — XP, niveaux, streak de jours, badges. Alimentée par les runs.
// C'est ce qui transforme l'app en jeu : progression, déblocage, fierté.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Badge = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  unlocked: boolean;
};

const BADGES: Omit<Badge, 'unlocked'>[] = [
  { id: 'first', emoji: '👟', label: 'Premier run', desc: 'Termine ta première course' },
  { id: 'paint5', emoji: '🎨', label: '5 km peints', desc: 'Peins 5 km au total' },
  { id: 'paint50', emoji: '⚡', label: '50 km peints', desc: 'Peins 50 km au total' },
  { id: 'streak3', emoji: '🔥', label: 'Série de 3', desc: '3 jours de course d’affilée' },
  { id: 'streak7', emoji: '🗓', label: 'Semaine parfaite', desc: '7 jours d’affilée' },
  { id: 'capture', emoji: '💥', label: 'Conquérant', desc: 'Reprends une rue adverse' },
  { id: 'earlybird', emoji: '🌅', label: 'Lève-tôt', desc: 'Cours avant 8 h' },
  { id: 'champion', emoji: '🏆', label: 'Champion', desc: 'Termine #1 d’une saison' },
];

// XP cumulée nécessaire pour atteindre le niveau n (courbe douce)
function xpForLevel(level: number): number {
  return Math.round(400 * Math.pow(level, 1.5));
}
export function levelFromXp(xp: number): { level: number; into: number; span: number; progress: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = xp - base;
  const span = next - base;
  return { level, into, span, progress: span > 0 ? into / span : 0 };
}

type GameState = {
  xp: number;
  streak: number;
  lastRunDay: string | null;
  badges: Record<string, boolean>;
  /** événements à célébrer au prochain rendu (confettis, level-up) */
  pendingCelebration: { kind: 'levelup' | 'badge'; label: string } | null;
  /** XP gagné au dernier run (affichage fin de run) */
  lastGain: number;
  awardRun: (input: {
    distanceM: number;
    paintedM: number;
    captures: number;
    totalPaintedM: number;
    hour: number;
  }) => { xpGained: number; leveledTo: number | null; newBadges: Badge[] };
  unlock: (id: string) => void;
  clearCelebration: () => void;
  getBadges: () => Badge[];
};

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function isYesterday(key: string): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return key === dayKey(y);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: 0,
      lastRunDay: null,
      badges: {},
      pendingCelebration: null,
      lastGain: 0,

      awardRun: ({ distanceM, paintedM, captures, totalPaintedM, hour }) => {
        const st = get();
        const before = levelFromXp(st.xp).level;
        // XP : 10 / 100 m peints + 50 / capture + bonus distance
        const xpGained = Math.round(paintedM / 10) + captures * 50 + Math.round(distanceM / 20);
        const xp = st.xp + xpGained;

        // streak
        const today = dayKey();
        let streak = st.streak;
        if (st.lastRunDay !== today) {
          streak = st.lastRunDay && isYesterday(st.lastRunDay) ? st.streak + 1 : 1;
        }

        // badges
        const badges = { ...st.badges };
        const totalKm = totalPaintedM / 1000;
        const tryUnlock = (id: string, cond: boolean) => cond && !badges[id] && (badges[id] = true);
        tryUnlock('first', true);
        tryUnlock('paint5', totalKm >= 5);
        tryUnlock('paint50', totalKm >= 50);
        tryUnlock('streak3', streak >= 3);
        tryUnlock('streak7', streak >= 7);
        tryUnlock('capture', captures > 0);
        tryUnlock('earlybird', hour < 8);

        const after = levelFromXp(xp).level;
        const leveledTo = after > before ? after : null;
        const newBadges = BADGES.filter((b) => badges[b.id] && !st.badges[b.id]).map((b) => ({ ...b, unlocked: true }));

        set({
          xp,
          streak,
          lastRunDay: today,
          badges,
          lastGain: xpGained,
          pendingCelebration: leveledTo
            ? { kind: 'levelup', label: `Niveau ${leveledTo} !` }
            : newBadges[0]
              ? { kind: 'badge', label: newBadges[0].label }
              : null,
        });
        return { xpGained, leveledTo, newBadges };
      },

      unlock: (id) => set({ badges: { ...get().badges, [id]: true } }),
      clearCelebration: () => set({ pendingCelebration: null }),
      getBadges: () => BADGES.map((b) => ({ ...b, unlocked: !!get().badges[b.id] })),
    }),
    { name: 'bornes-game', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
