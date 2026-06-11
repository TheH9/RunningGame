// RunDirector — la voix du jeu pendant le run. Hors React : s'abonne au
// moteur de run, consulte le territoire AVANT la peinture, et pousse les
// événements (captures, contestations, paliers, splits, drop, GPS, vitesse).

import { latLngToCell } from 'h3-js';
import { getBackend } from '../backend/GameBackend';
import type { Drop } from '../backend/types';
import { haversine, type GeoPoint } from './geo';
import { H3_RES } from './territory';
import { useRunEventsStore } from '../store/useRunEventsStore';
import { useRunStore } from '../store/useRunStore';
import { useTerritoryStore } from '../store/useTerritoryStore';
import { TEAMS, type TeamSlug } from '../theme/tokens';

const MILESTONE_M = 250;

export function startRunDirector(team: TeamSlug): () => void {
  const events = useRunEventsStore.getState();
  events.resetForRun();

  const seen = new Set<string>();
  let lastPoint: GeoPoint | null = null;
  let nextMilestone = MILESTONE_M;
  let lastKm = 0;
  let lastKmAt = 0;
  let wasAutoPaused = false;
  let wasTooFast = false;
  let drop: Drop | null = null;
  let dropDone = false;

  getBackend().getActiveDrop().then((d) => (drop = d)).catch(() => {});

  const unsub = useRunStore.subscribe((s) => {
    const push = useRunEventsStore.getState().push;

    // transitions GPS / vitesse
    if (s.autoPaused !== wasAutoPaused) {
      wasAutoPaused = s.autoPaused;
      push(
        s.autoPaused
          ? { kind: 'gps-lost', text: '📡 Signal GPS perdu — pause auto', haptic: 'warning' }
          : { kind: 'gps-back', text: '📡 Signal retrouvé — c’est reparti !', haptic: 'success' },
      );
    }
    if (s.tooFastNow !== wasTooFast) {
      wasTooFast = s.tooFastNow;
      if (s.tooFastNow) push({ kind: 'too-fast', text: '🚗 Trop rapide — peinture suspendue', haptic: 'warning' });
    }

    const p = s.lastPoint;
    if (!p || p === lastPoint || s.status !== 'running') return;
    lastPoint = p;

    // paliers de peinture
    const painted = Math.max(0, s.distanceM - s.flaggedM);
    if (painted >= nextMilestone) {
      nextMilestone += MILESTONE_M;
      push({ kind: 'paint-milestone', text: `🎨 +${Math.floor(painted)} m peints pour ${TEAMS[team].name}`, team, haptic: 'light' });
    }

    // splits km (avec allure du split)
    const km = Math.floor(s.distanceM / 1000);
    if (km > lastKm) {
      const splitMs = s.elapsedMs - lastKmAt;
      lastKm = km;
      lastKmAt = s.elapsedMs;
      const min = Math.floor(splitMs / 60000);
      const sec = Math.round((splitMs % 60000) / 1000);
      push({ kind: 'km-split', text: `📍 Km ${km} — ${min}:${String(sec).padStart(2, '0')} /km`, haptic: 'medium' });
    }

    // territoire : nouvelle cellule → qui la tient ?
    const h3 = latLngToCell(p.lat, p.lon, H3_RES);
    if (!seen.has(h3)) {
      seen.add(h3);
      const territory = useTerritoryStore.getState();
      const v = territory.ownerOf(h3);
      if (!v.owner) {
        useRunEventsStore.getState().bumpZones(1, 0, 0);
      } else if (v.owner === team) {
        useRunEventsStore.getState().bumpZones(1, 0, 0);
        push({ kind: 'defend', text: `🛡 Tu renforces le territoire ${TEAMS[team].name}`, team, haptic: 'none' });
      } else {
        // cellule adverse : un passage suffit-il à la prendre ?
        const enemy = TEAMS[v.owner].name;
        if (v.strength <= 0.18 || v.fading) {
          useRunEventsStore.getState().bumpZones(1, 1, 0);
          push({ kind: 'capture', text: `💥 Zone reprise aux ${enemy.replace('Les ', '')} !`, team, haptic: 'success' });
        } else {
          useRunEventsStore.getState().bumpZones(1, 0, 1);
          push({ kind: 'contest', text: `⚔️ Zone ${enemy} contestée — repasse pour la prendre`, team: v.owner, haptic: 'medium' });
        }
      }
    }

    // drop : entrée dans le rayon pendant un run actif
    if (drop && !dropDone && Date.now() >= drop.startsAt && Date.now() <= drop.endsAt) {
      const d = haversine(p, { lat: drop.center.lat, lon: drop.center.lon, t: 0 });
      if (d <= drop.radiusM) {
        dropDone = true;
        markDropQualified(drop.id);
        push({ kind: 'drop-qualified', text: `🎁 Drop attrapé ! Réclame ton lot dans Récompenses`, haptic: 'success' });
      }
    }
  });

  return unsub;
}

// — qualification de drop (lue par l'écran Récompenses) —
import AsyncStorage from '@react-native-async-storage/async-storage';

const DROP_KEY = 'bornes-drop-qualified';

export function markDropQualified(dropId: string) {
  AsyncStorage.setItem(DROP_KEY, dropId).catch(() => {});
}

export async function getQualifiedDrop(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DROP_KEY);
  } catch {
    return null;
  }
}

export async function clearQualifiedDrop() {
  AsyncStorage.removeItem(DROP_KEY).catch(() => {});
}
