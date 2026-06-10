// Rivaux en live — points colorés + mini-traînée + pseudo. Couche minuscule
// (≤ 6 bots) re-rendue au rythme du botEngine (1,5 s) : volontairement simple.

import React from 'react';
import { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import type { LiveBot } from '../../store/useTerritoryStore';
import type { LatLon } from '../../lib/world';
import { TEAMS } from '../../theme/tokens';
import { polyline, projectionFor } from './mapShared';

type Props = {
  anchor: LatLon;
  bots: LiveBot[];
  /** au zoom rue on affiche les pseudos */
  showNames: boolean;
  dark: boolean;
};

export const BotsLayer = React.memo(function BotsLayer({ anchor, bots, showNames, dark }: Props) {
  const proj = projectionFor(anchor);
  return (
    <G>
      {bots.map((b) => {
        const color = TEAMS[b.team].color;
        const pos = proj.toXY(b.pos);
        const tail = b.tail.map((p) => proj.toXY(p));
        return (
          <G key={b.id}>
            {tail.length >= 2 && (
              <Path d={polyline(tail)} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
            )}
            <Circle cx={pos.x} cy={pos.y} r={7.5} fill={color} opacity={0.25} />
            <Circle cx={pos.x} cy={pos.y} r={4.5} fill={color} stroke={dark ? '#0E1116' : '#FFFFFF'} strokeWidth={1.8} />
            {showNames && (
              <SvgText x={pos.x} y={pos.y - 10} fontSize={9.5} fontWeight="700" fill={dark ? '#C7CDD6' : '#3A3F4C'} textAnchor="middle">
                {b.pseudo}
              </SvgText>
            )}
          </G>
        );
      })}
    </G>
  );
});
