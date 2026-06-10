// Socle de la ville — memo pur, rendu UNE fois par thème.
// Fake-3D : chaque bloc = ombre portée + mur (extrusion) + toit + liseré
// lumineux. Rues en 2 passes concaténées (casing + cœur) = 2 paths.

import React, { useMemo } from 'react';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { getWorld, type LatLon } from '../../lib/world';
import { CANVAS, HALF, MAP_DARK, MAP_LIGHT, PX_PER_M, projectionFor, smooth } from './mapShared';

type Props = { anchor: LatLon; dark: boolean };

export const CityBase = React.memo(function CityBase({ anchor, dark }: Props) {
  const C = dark ? MAP_DARK : MAP_LIGHT;

  const geom = useMemo(() => {
    const world = getWorld(anchor);
    const proj = projectionFor(anchor);

    const blocks = world.blocks.map((b) => ({
      x: b.x * PX_PER_M,
      y: b.y * PX_PER_M,
      w: b.w * PX_PER_M,
      h: b.h * PX_PER_M,
      lift: 2 + b.tall * 3, // hauteur d'extrusion fake-3D en px
    }));

    let streetsD = '';
    for (const s of world.streets) {
      streetsD += smooth(s.pts.map((p) => proj.toXY(p))) + ' ';
    }

    const parks = world.parks.map((p) => ({ cx: p.cx * PX_PER_M, cy: p.cy * PX_PER_M, r: p.r * PX_PER_M }));
    const riverY = world.riverY * PX_PER_M;
    const labels = world.districts.map((d) => ({ ...proj.toXY(d.center), name: d.name }));
    return { blocks, streetsD, parks, riverY, labels };
  }, [anchor]);

  return (
    <G>
      <Rect x={-HALF} y={-HALF} width={CANVAS} height={CANVAS} fill={C.land} />

      {/* parcs */}
      {geom.parks.map((p, i) => (
        <Circle key={`pk${i}`} cx={p.cx} cy={p.cy} r={p.r} fill={C.park} stroke={C.parkEdge} strokeWidth={1.2} />
      ))}

      {/* rivière (bande sud) */}
      <Rect x={-HALF} y={geom.riverY} width={CANVAS} height={64} rx={26} fill={C.water} stroke={C.waterEdge} strokeWidth={1.2} />

      {/* blocs fake-3D : ombre → mur → toit → liseré */}
      <G>
        {geom.blocks.map((b, i) => (
          <Rect key={`s${i}`} x={b.x + b.lift * 0.9} y={b.y + b.lift * 1.1} width={b.w} height={b.h} rx={3.5} fill={C.blockShadow} />
        ))}
        {geom.blocks.map((b, i) => (
          <Rect key={`w${i}`} x={b.x} y={b.y + b.lift} width={b.w} height={b.h} rx={3.5} fill={C.blockWall} />
        ))}
        {geom.blocks.map((b, i) => (
          <Rect key={`r${i}`} x={b.x} y={b.y} width={b.w} height={b.h} rx={3.5} fill={C.blockRoof} />
        ))}
        {geom.blocks.map((b, i) => (
          <Path key={`e${i}`} d={`M ${b.x + 2} ${b.y + 1} H ${b.x + b.w - 2}`} stroke={C.blockEdge} strokeWidth={1.4} strokeLinecap="round" />
        ))}
      </G>

      {/* rues : 2 paths concaténés (casing + cœur) */}
      <Path d={geom.streetsD} fill="none" stroke={C.roadCase} strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={geom.streetsD} fill="none" stroke={C.road} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />

      {/* noms de quartiers */}
      {geom.labels.map((l) => (
        <SvgText key={l.name} x={l.x} y={l.y} fontSize={12} fontWeight="700" fill={C.label} textAnchor="middle" opacity={0.85}>
          {l.name}
        </SvgText>
      ))}
    </G>
  );
});
