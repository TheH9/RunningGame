// Hexagones H3 — la vue « plateau » au dézoom (ADR-003). Visualisation
// directe des cellules de score : fill par équipe × bucket de force,
// contours pointillés bicolores pour les cellules contestées.

import React, { useMemo } from 'react';
import { G, Path } from 'react-native-svg';
import type { CellScore } from '../../backend/types';
import { cellPolygon, cellView } from '../../lib/territory';
import type { LatLon } from '../../lib/world';
import { TEAMS, type TeamSlug } from '../../theme/tokens';
import { projectionFor } from './mapShared';

type Props = {
  anchor: LatLon;
  cells: Map<string, CellScore>;
  version: number;
  dark: boolean;
};

function hexD(h3: string, proj: ReturnType<typeof projectionFor>): string {
  const poly = cellPolygon(h3).map((p) => proj.toXY(p));
  let d = `M ${poly[0].x.toFixed(1)} ${poly[0].y.toFixed(1)}`;
  for (let i = 1; i < poly.length; i++) d += ` L ${poly[i].x.toFixed(1)} ${poly[i].y.toFixed(1)}`;
  return d + ' Z ';
}

export const TerritoryHexes = React.memo(
  function TerritoryHexes({ anchor, cells, dark }: Props) {
    const layers = useMemo(() => {
      const proj = projectionFor(anchor);
      const now = Date.now();
      // fill par équipe × bucket de force (3) + contestés à part
      const fills = new Map<string, { team: TeamSlug; opacity: number; d: string }>();
      const contested: { d: string; owner: TeamSlug; challenger: TeamSlug }[] = [];
      for (const c of cells.values()) {
        const v = cellView(c, now);
        if (!v.owner) continue;
        const d = hexD(c.h3, proj);
        if (v.contested && v.challenger) {
          contested.push({ d, owner: v.owner, challenger: v.challenger });
          continue;
        }
        const bucket = v.strength > 0.66 ? 2 : v.strength > 0.33 ? 1 : 0;
        const key = `${v.owner}-${bucket}`;
        const opacity = [0.14, 0.26, 0.4][bucket] * (v.fading ? 0.5 : 1);
        const g = fills.get(key);
        if (g) g.d += d;
        else fills.set(key, { team: v.owner, opacity, d });
      }
      return { fills: [...fills.values()], contested };
    }, [anchor, cells]);

    const dim = dark ? 0.85 : 1;

    return (
      <G>
        {layers.fills.map((f, i) => (
          <Path key={i} d={f.d} fill={TEAMS[f.team].color} fillOpacity={f.opacity * dim} stroke={TEAMS[f.team].color} strokeOpacity={Math.min(0.6, f.opacity * 2) * dim} strokeWidth={0.8} />
        ))}
        {layers.contested.map((c, i) => (
          <G key={`c${i}`}>
            <Path d={c.d} fill={TEAMS[c.owner].color} fillOpacity={0.12 * dim} stroke={TEAMS[c.owner].color} strokeWidth={1.4} strokeDasharray="4 4" strokeOpacity={0.8} />
            <Path d={c.d} fill="none" stroke={TEAMS[c.challenger].color} strokeWidth={1.4} strokeDasharray="4 4" strokeDashoffset={4} strokeOpacity={0.8} />
          </G>
        ))}
      </G>
    );
  },
  (prev, next) => prev.version === next.version && prev.dark === next.dark && prev.anchor === next.anchor,
);
