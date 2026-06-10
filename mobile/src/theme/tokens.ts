// Design system v2 — « JEU » : dark-first, néon, glass, typo XXL.
// Violet électrique = couleur signature de Bornes. Équipes en néon.

export const TEAMS = {
  vagues: { slug: 'vagues', name: 'Les Vagues', color: '#48B9FF', soft: '#A9DEFF', glow: 'rgba(72,185,255,0.55)', emoji: '🌊' },
  braises: { slug: 'braises', name: 'Les Braises', color: '#FF4D6A', soft: '#FF9FB0', glow: 'rgba(255,77,106,0.55)', emoji: '🔥' },
  soleils: { slug: 'soleils', name: 'Les Soleils', color: '#FFD23C', soft: '#FFE894', glow: 'rgba(255,210,60,0.5)', emoji: '☀️' },
  pousses: { slug: 'pousses', name: 'Les Pousses', color: '#2EE6A6', soft: '#90F2D2', glow: 'rgba(46,230,166,0.5)', emoji: '🌱' },
} as const;

export type TeamSlug = keyof typeof TEAMS;

// Couleur signature du jeu = VERT ACIDE (énergie, XP, actions).
// Texte foncé sur cette couleur (elle est claire) — look « energy drink / gamer ».
export const ENERGY = '#B8FF2E';
export const ENERGY_2 = '#D4FF6B';
export const ON_ENERGY = '#0A0B0F';
export const CYAN = '#48B9FF';
// alias rétro-compat (anciens imports VIOLET) → pointent vers le vert acide
export const VIOLET = ENERGY;
export const VIOLET_2 = ENERGY_2;

// Palette sombre (toute l'app)
export const c = {
  bg: '#0A0B0F',
  bg2: '#0E0F15',
  surface: 'rgba(255,255,255,0.05)',
  surfaceSolid: '#14161E',
  surfaceHi: 'rgba(255,255,255,0.09)',
  hairline: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textDim: '#AAB0BD',
  textMuted: '#7A818F',
  violet: ENERGY,
  violet2: ENERGY_2,
  energy: ENERGY,
  energy2: ENERGY_2,
  onEnergy: ON_ENERGY,
  cyan: CYAN,
  gold: '#FFD23C',
  green: '#2EE6A6',
  red: '#FF4D6A',
};

// Verre dépoli — style commun des cartes/barres
export const glass = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
} as const;

export const radius = { sm: 14, md: 20, lg: 26, xl: 32, pill: 999 };

// Police : Archivo (chargée au boot). fams() renvoie les noms réels.
export const font = {
  black: 'Archivo_900Black',
  extrabold: 'Archivo_800ExtraBold',
  bold: 'Archivo_700Bold',
};

// glow coloré réutilisable (ombre portée teintée)
export function glow(color: string, radius = 24, opacity = 0.6) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  };
}

// --- compat : anciens écrans importent encore `light`/`dark`/`map` ---
export const dark = {
  bg: c.bg,
  surface: 'rgba(20,22,30,0.92)',
  text: c.text,
  textMuted: c.textMuted,
  border: c.hairline,
  accent: ENERGY,
};
export const light = dark; // l'app est dark-first désormais
export const map = {
  land: '#0A0B0F', block: '#11131A', roadCase: '#070A0E', road: '#1B1F29',
  water: '#0F2133', park: '#10201A',
  darkLand: '#0A0B0F', darkBlock: '#11131A', darkRoad: '#1B1F29',
  // la trace du joueur reste cyan lumineux pour rester lisible sur toutes
  // les couleurs d'équipe (le vert acide se mélangerait aux Pousses)
  trailCore: '#7ECBFF', trailHalo: CYAN, trailHot: '#FFFFFF',
};
