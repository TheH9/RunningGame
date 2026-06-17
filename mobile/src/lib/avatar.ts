// Avatar du joueur — logique PURE et testable (aucun import @dicebear ni
// react-native ici, pour rester chargeable par Jest en environnement node).
// Le rendu SVG vit dans ./avatarSvg.ts (isole la librairie générée).

import { makeRng } from './world';

/** Styles proposés dans l'éditeur (clé stable persistée + libellé UI). */
export const AVATAR_STYLES = [
  { key: 'adventurer', label: 'Aventurier' },
  { key: 'avataaars', label: 'Perso' },
  { key: 'micah', label: 'Minimal' },
  { key: 'big-smile', label: 'Sourire' },
  { key: 'fun-emoji', label: 'Emoji' },
] as const;

export type AvatarStyleKey = (typeof AVATAR_STYLES)[number]['key'];

const STYLE_KEYS = AVATAR_STYLES.map((s) => s.key) as AvatarStyleKey[];

/** Fonds proposés (hex sans #, format DiceBear). */
export const AVATAR_BACKGROUNDS = ['transparent', 'b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1f4d9'];

/** Config sérialisable (jsonb-friendly) stockée sur le profil. */
export type AvatarConfig = {
  style: AvatarStyleKey;
  seed: string;
  backgroundColor?: string; // hex sans # ou 'transparent'
};

function isStyleKey(v: unknown): v is AvatarStyleKey {
  return typeof v === 'string' && (STYLE_KEYS as string[]).includes(v);
}

/** Parse défensif d'une valeur venue du jsonb Supabase (tolère null/garbage). */
export function normalizeAvatar(raw: unknown, fallbackSeed = 'bornes'): AvatarConfig {
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (isStyleKey(o.style) && typeof o.seed === 'string' && o.seed.length > 0) {
      return {
        style: o.style,
        seed: o.seed,
        backgroundColor: typeof o.backgroundColor === 'string' ? o.backgroundColor : 'transparent',
      };
    }
  }
  return avatarFromSeed(fallbackSeed);
}

/** Avatar déterministe à partir d'une graine (pseudo) — bots & profils sans avatar. */
export function avatarFromSeed(seed: string): AvatarConfig {
  const rng = makeRng(hash(seed));
  const style = STYLE_KEYS[Math.floor(rng() * STYLE_KEYS.length)];
  return { style, seed, backgroundColor: 'transparent' };
}

/** Graine aléatoire (bouton « mélanger » de l'éditeur). */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

// hash déterministe string → entier (pour seeder makeRng).
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 1_000_000;
}
