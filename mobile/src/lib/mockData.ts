// Données de démo (hors-ligne) — remplacées par Supabase (team_scores,
// challenges, prizes_won) dès que les env EXPO_PUBLIC_SUPABASE_* sont posées.

import type { TeamSlug } from '../theme/tokens';

export const CITY_CONTROL: { team: TeamSlug; percent: number }[] = [
  { team: 'vagues', percent: 42 },
  { team: 'braises', percent: 23 },
  { team: 'soleils', percent: 19 },
  { team: 'pousses', percent: 16 },
];

export const NEIGHBORHOODS: { name: string; leader: TeamSlug; percent: number }[] = [
  { name: 'Centre-ville', leader: 'vagues', percent: 61 },
  { name: 'Quartier Gare', leader: 'braises', percent: 48 },
  { name: 'Bords de Seine', leader: 'soleils', percent: 44 },
  { name: 'Parc Robinson', leader: 'pousses', percent: 39 },
];

export const TOP_RUNNERS: { pseudo: string; team: TeamSlug; paintedKm: number }[] = [
  { pseudo: 'Maya', team: 'vagues', paintedKm: 48.2 },
  { pseudo: 'Karim', team: 'braises', paintedKm: 44.7 },
  { pseudo: 'Léa', team: 'vagues', paintedKm: 41.3 },
  { pseudo: 'Tom', team: 'soleils', paintedKm: 38.9 },
  { pseudo: 'Inès', team: 'pousses', paintedKm: 36.1 },
];

export const CHALLENGE = {
  title: 'Défi Crock Sport',
  partner: 'Crock Sport · Asnières Centre',
  description: 'Peins 25 km dans le mois → tirage au sort le 30 juin',
  prize: 'Une paire de running (valeur 140 €)',
  goalKm: 25,
  endsAt: '30 juin',
};
