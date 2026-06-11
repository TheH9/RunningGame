// Client Supabase — singleton de production. Si les variables
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY manquent (build mal
// configuré), `supabase` vaut null : l'auth bloque et les lectures retombent
// sur du vide — l'app échoue visiblement plutôt que de simuler du contenu.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { latLngToCell } from 'h3-js';
import { H3_RES } from './territory';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // Mobile : on récupère la session via le deep-link OAuth nous-mêmes
          // (échange du code PKCE), pas via une URL de navigateur.
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
    : null;

export const isOnline = () => supabase !== null;

/** Upload par batch de la trace simplifiée (ADR-002 §1). No-op hors ligne. */
export async function uploadRunPoints(
  runId: string,
  points: { lat: number; lon: number; t: number; accuracy?: number }[],
) {
  if (!supabase || points.length === 0) return;
  await supabase.from('run_points').insert(
    points.map((p) => ({
      run_id: runId,
      // EWKT avec SRID explicite : la colonne est geometry(Point,4326) et
      // rejette une géométrie sans SRID (un simple "POINT(...)" échoue).
      geom: `SRID=4326;POINT(${p.lon} ${p.lat})`,
      recorded_at: new Date(p.t).toISOString(),
      accuracy_m: p.accuracy ?? null,
      // Cellule H3 calculée côté client (l'extension Postgres h3 n'est pas
      // dispo sur Supabase) : c'est la source du scoring serveur (score_run).
      h3_index: latLngToCell(p.lat, p.lon, H3_RES),
    })),
  );
}

export async function finishRun(runId: string, distanceM: number, paintedM: number) {
  if (!supabase) return;
  await supabase
    .from('runs')
    .update({ status: 'finished', ended_at: new Date().toISOString(), distance_m: distanceM, painted_m: paintedM })
    .eq('id', runId);
  // déclenche le scoring async — l'UX n'attend pas le résultat
  supabase.functions.invoke('score-run', { body: { run_id: runId } }).catch(() => {});
}
