// Tap d'inspection — hit-test partagé par les deux rendus de carte : trail le
// plus proche (< 40 m), propriétaire de la cellule H3, puis vrai nom de rue
// (geocoder natif) poussé en différé.

import { latLngToCell } from 'h3-js';
import type { PaintedTrail } from '../../backend/types';
import { haversine } from '../../lib/geo';
import { streetNameFor } from '../../lib/locate';
import { H3_RES } from '../../lib/territory';
import type { LatLon } from '../../lib/world';
import { useTerritoryStore } from '../../store/useTerritoryStore';
import type { InspectInfo } from './mapShared';

export function inspectAt(geo: LatLon, onInspect: (info: InspectInfo) => void): void {
  // trail le plus proche (< 40 m)
  let best: PaintedTrail | null = null;
  let bestD = 40;
  for (const t of useTerritoryStore.getState().trails) {
    for (const p of t.points) {
      const dM = haversine({ ...p }, { ...geo, t: 0 });
      if (dM < bestD) {
        bestD = dM;
        best = t;
      }
    }
  }
  const h3 = latLngToCell(geo.lat, geo.lon, H3_RES);
  const cell = useTerritoryStore.getState().ownerOf(h3);
  if (!best && !cell.owner) return; // tap dans le vide → rien

  // carte immédiate, puis vrai nom de rue quand le geocoder répond
  const info: InspectInfo = { geo, streetName: 'Cette zone', trail: best, cell };
  onInspect(info);
  streetNameFor(geo)
    .then((name) => name && onInspect({ ...info, streetName: name }))
    .catch(() => {});
}
