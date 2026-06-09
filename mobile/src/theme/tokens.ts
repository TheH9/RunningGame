// Design tokens — source de vérité : docs/03-design-systeme-visuel.md
// App en clair ; run actif en sombre immersif (décision maquettes).

export const TEAMS = {
  vagues: { slug: 'vagues', name: 'Les Vagues', color: '#3B82F6', soft: '#9DC2FF', emoji: '🌊' },
  braises: { slug: 'braises', name: 'Les Braises', color: '#FF4D5E', soft: '#FF9AA3', emoji: '🔥' },
  soleils: { slug: 'soleils', name: 'Les Soleils', color: '#F5B82E', soft: '#FFDE82', emoji: '☀️' },
  pousses: { slug: 'pousses', name: 'Les Pousses', color: '#2EB789', soft: '#86E0BB', emoji: '🌱' },
} as const;

export type TeamSlug = keyof typeof TEAMS;

export const light = {
  bg: '#F3F0E9',
  surface: '#FFFFFF',
  text: '#1C1E24',
  textMuted: '#8A8FA0',
  border: 'rgba(31,41,55,0.08)',
  shadow: 'rgba(31,41,55,0.16)',
};

export const dark = {
  bg: '#0E1116',
  surface: 'rgba(22,26,33,0.92)',
  text: '#FFFFFF',
  textMuted: '#9AA3B2',
  border: 'rgba(255,255,255,0.08)',
  accent: '#6AA6FF',
};

export const map = {
  // zoom rue (clair)
  land: '#F3F0E9',
  block: '#E9E5DC',
  roadCase: '#D9D3C7',
  road: '#FFFFFF',
  water: '#BFE0F2',
  park: '#CFE8C7',
  // run actif (sombre)
  darkLand: '#0E1116',
  darkBlock: '#141821',
  darkRoad: '#222932',
  trailCore: '#6AA6FF',
  trailHalo: '#3B82F6',
  trailHot: '#FFFFFF',
};

export const radius = { card: 22, chip: 999, button: 18 };

export const font = {
  // Inter à charger en phase polish ; system en attendant
  weightBold: '800' as const,
  weightSemi: '700' as const,
};
