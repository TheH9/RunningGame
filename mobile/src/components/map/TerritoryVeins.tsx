// Veines de territoire — les traces peintes (bots + moi), groupées par
// équipe × bucket de fraîcheur et CONCATÉNÉES (≤ 24 paths). Memo : version.

import React, { useMemo } from 'react';
import { G, Path } from 'react-native-svg';
import type { PaintedTrail } from '../../backend/types';
import type { LatLon } from '../../lib/world';
import { TEAMS, type TeamSlug } from '../../theme/tokens';
import { projectionFor, smooth } from './mapShared';

type Bucket = 'fresh' | 'recent' | 'old';

const FRESH_MS = 5 * 60 * 1000;
const RECENT_MS = 3 * 24 * 3600 * 1000;

const BUCKET_STYLE: Record<Bucket, { haloW: number; haloO: number; coreW: number; coreO: number }> = {
  fresh: { haloW: 11, haloO: 0.38, coreW: 3.2, coreO: 1 },
  recent: { haloW: 8, haloO: 0.16, coreW: 2.4, coreO: 0.65 },
  old: { haloW: 6, haloO: 0.07, coreW: 2, coreO: 0.34 },
};

type Props = {
  anchor: LatLon;
  trails: PaintedTrail[];
  version: number;
  dark: boolean;
};

export const TerritoryVeins = React.memo(
  function TerritoryVeins({ anchor, trails, dark }: Props) {
    const groups = useMemo(() => {
      const proj = projectionFor(anchor);
      const now = Date.now();
      const acc = new Map<string, { team: TeamSlug; bucket: Bucket; d: string }>();
      for (const t of trails) {
        if (t.points.length < 2) continue;
        const age = now - t.paintedAt;
        const bucket: Bucket = age < FRESH_MS ? 'fresh' : age < RECENT_MS ? 'recent' : 'old';
        const key = `${t.team}-${bucket}`;
        const d = smooth(t.points.map((p) => proj.toXY(p)));
        const g = acc.get(key);
        if (g) g.d += ' ' + d;
        else acc.set(key, { team: t.team, bucket, d });
      }
      return [...acc.values()];
    }, [anchor, trails]);

    const dim = dark ? 1 : 0.85;

    return (
      <G>
        {groups.map((g) => {
          const st = BUCKET_STYLE[g.bucket];
          const color = TEAMS[g.team].color;
          return (
            <G key={`${g.team}-${g.bucket}`}>
              <Path d={g.d} fill="none" stroke={color} strokeOpacity={st.haloO * dim} strokeWidth={st.haloW} strokeLinecap="round" strokeLinejoin="round" />
              <Path d={g.d} fill="none" stroke={color} strokeOpacity={st.coreO * dim} strokeWidth={st.coreW} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          );
        })}
      </G>
    );
  },
  // re-rend uniquement quand version / thème changent
  (prev, next) => prev.version === next.version && prev.dark === next.dark && prev.anchor === next.anchor,
);
