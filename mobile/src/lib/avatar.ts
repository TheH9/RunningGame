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
export const AVATAR_BACKGROUNDS = [
  'transparent', 'b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1f4d9', 'a0e7e5', 'fbe7c6', 'ffaebc',
];

/** Couleurs proposées pour un dégradé (2e teinte). 'aucun' = fond uni. */
export const AVATAR_GRADIENTS = ['aucun', 'c0aede', 'ffd5dc', 'ffdfbf', 'a0e7e5', 'ffaebc'];

/** Niveaux de zoom proposés (DiceBear `scale`, en %). */
export const AVATAR_SCALES = [
  { v: 80, label: 'Petit' },
  { v: 100, label: 'Normal' },
  { v: 120, label: 'Grand' },
] as const;

/** Inclinaisons proposées (DiceBear `rotate`, en degrés). */
export const AVATAR_ROTATIONS = [
  { v: 350, label: '↺' },
  { v: 0, label: 'Droit' },
  { v: 10, label: '↻' },
] as const;

const SCALE_MIN = 50;
const SCALE_MAX = 150;
const SCALE_DEFAULT = 100;

/** Config sérialisable (jsonb-friendly) stockée sur le profil. Les champs
 * optionnels sont omis quand ils valent leur défaut, pour garder un objet
 * canonique et stable (clé de cache, égalité). */
export type AvatarConfig = {
  style: AvatarStyleKey;
  seed: string;
  backgroundColor?: string; // 'transparent' ou hex6 (sans #)
  backgroundColor2?: string; // 2e teinte → dégradé (ignorée si fond transparent)
  flip?: boolean; // miroir horizontal
  rotate?: number; // 0..359 (omis quand 0)
  scale?: number; // 50..150 (omis quand 100)
};

function isStyleKey(v: unknown): v is AvatarStyleKey {
  return typeof v === 'string' && (STYLE_KEYS as string[]).includes(v);
}

/** Valide une teinte hex6 (sans #). Renvoie la forme minuscule ou undefined. */
function normHex(v: unknown): string | undefined {
  return typeof v === 'string' && /^[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined;
}

/** Fond : 'transparent' ou hex6 valide, sinon 'transparent'. */
function normBackground(v: unknown): string {
  if (v === 'transparent') return 'transparent';
  return normHex(v) ?? 'transparent';
}

/** Rotation ramenée dans [0,360). undefined si non numérique. */
function normRotate(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return ((Math.round(v) % 360) + 360) % 360;
}

/** Zoom borné à [50,150]. undefined si non numérique. */
function clampScale(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(v)));
}

/** Parse défensif d'une valeur venue du jsonb Supabase (tolère null/garbage).
 * Idempotent : normalizeAvatar(normalizeAvatar(x)) === normalizeAvatar(x). */
export function normalizeAvatar(raw: unknown, fallbackSeed = 'bornes'): AvatarConfig {
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (isStyleKey(o.style) && typeof o.seed === 'string' && o.seed.length > 0) {
      const cfg: AvatarConfig = {
        style: o.style,
        seed: o.seed,
        backgroundColor: normBackground(o.backgroundColor),
      };
      const bg2 = normHex(o.backgroundColor2);
      if (bg2 && cfg.backgroundColor !== 'transparent') cfg.backgroundColor2 = bg2;
      if (o.flip === true) cfg.flip = true;
      const rot = normRotate(o.rotate);
      if (rot) cfg.rotate = rot; // omet 0
      const sc = clampScale(o.scale);
      if (sc !== undefined && sc !== SCALE_DEFAULT) cfg.scale = sc; // omet 100
      return cfg;
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
