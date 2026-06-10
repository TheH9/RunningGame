// Ma trace en cours — comète : halo + cœur + tête blanc chaud + pointillés.

import React, { useMemo } from 'react';
import { Circle, G, Path } from 'react-native-svg';
import type { GeoPoint } from '../../lib/geo';
import type { LatLon } from '../../lib/world';
import { map as M } from '../../theme/tokens';
import { projectionFor, smooth } from './mapShared';

type Props = { anchor: LatLon; trail: GeoPoint[]; dark: boolean };

export const MyTrail = React.memo(function MyTrail({ anchor, trail, dark }: Props) {
  const geom = useMemo(() => {
    if (trail.length < 2) return null;
    const proj = projectionFor(anchor);
    const pts = trail.map((p) => proj.toXY(p));
    const d = smooth(pts);
    const hotStart = Math.max(0, pts.length - 6);
    const hot = smooth(pts.slice(hotStart));
    return { d, hot, start: pts[0] };
  }, [anchor, trail]);

  if (!geom) return null;

  return (
    <G>
      <Path d={geom.d} fill="none" stroke={M.trailHalo} strokeOpacity={0.5} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={geom.d} fill="none" stroke={M.trailCore} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={geom.hot} fill="none" stroke={M.trailHot} strokeOpacity={0.9} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={geom.d} fill="none" stroke="#EAF2FF" strokeOpacity={0.8} strokeWidth={1.5} strokeDasharray="1 8" strokeLinecap="round" />
      <Circle cx={geom.start.x} cy={geom.start.y} r={4} fill={dark ? '#0E1116' : '#FFFFFF'} stroke={M.trailCore} strokeWidth={2.4} />
    </G>
  );
});
