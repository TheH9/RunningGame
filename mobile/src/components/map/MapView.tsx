// MapView — la carte vivante. Caméra = transform GPU sur la View englobante
// (zéro re-rendu SVG en mouvement). Pinch-zoom avec fondu LOD veines↔hexagones
// (ADR-003), suivi du coureur façon GPS (curseur fixe, la ville défile),
// tap d'inspection (rue conquise → carte du conquérant).

import { latLngToCell } from 'h3-js';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { getBackend } from '../../backend/GameBackend';
import type { Drop, PaintedTrail } from '../../backend/types';
import type { GeoPoint } from '../../lib/geo';
import { H3_RES, type CellView } from '../../lib/territory';
import { DEFAULT_ANCHOR, getWorld, type LatLon } from '../../lib/world';
import { useAppStore } from '../../store/useAppStore';
import { useRunStore } from '../../store/useRunStore';
import { useTerritoryStore } from '../../store/useTerritoryStore';
import { TEAMS, type TeamSlug } from '../../theme/tokens';
import { BotsLayer } from './BotsLayer';
import { CityBase } from './CityBase';
import { CANVAS, LOD_HIGH, LOD_LOW, projectionFor, SCALE_MAX, SCALE_MIN } from './mapShared';
import { MyTrail } from './MyTrail';
import { TerritoryHexes } from './TerritoryHexes';
import { TerritoryVeins } from './TerritoryVeins';

export type InspectInfo = {
  geo: LatLon;
  streetName: string;
  trail: PaintedTrail | null;
  cell: CellView;
};

type Props = {
  dark?: boolean;
  team?: TeamSlug;
  /** trace du run en cours */
  trail?: GeoPoint[];
  /** gestes pinch/pan actifs */
  interactive?: boolean;
  /** caméra qui suit le coureur (run actif) */
  follow?: boolean;
  onInspect?: (info: InspectInfo) => void;
  initialScale?: number;
};

export function MapView({
  dark = false,
  team = 'vagues',
  trail = [],
  interactive = true,
  follow = false,
  onInspect,
  initialScale = 1,
}: Props) {
  const anchor = useAppStore((s) => s.worldAnchor) ?? DEFAULT_ANCHOR;
  const version = useTerritoryStore((s) => s.version);
  const botsVersion = useTerritoryStore((s) => s.botsVersion);
  const trails = useTerritoryStore((s) => s.trails);
  const cells = useTerritoryStore((s) => s.cells);
  const bots = useMemo(
    () => [...useTerritoryStore.getState().bots.values()],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [botsVersion],
  );

  const [size, setSize] = useState({ w: 390, h: 844 });
  const [drop, setDrop] = useState<Drop | null>(null);

  useEffect(() => {
    let alive = true;
    getBackend()
      .getActiveDrop()
      .then((d) => alive && setDrop(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const cx = size.w / 2;
  const cy = size.h / 2;

  // caméra
  const scale = useSharedValue(initialScale);
  const savedScale = useSharedValue(initialScale);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  // curseur (suivi)
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const bearing = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [breathe]);

  // suivi du coureur : la caméra glisse vers la tête de trace (+ lookahead)
  useEffect(() => {
    if (!follow) return;
    const proj = projectionFor(anchor);
    let prev: GeoPoint | null = null;
    const unsub = useRunStore.subscribe((s) => {
      const p = s.lastPoint;
      if (!p || p === prev) return;
      const head = proj.toXY(p);
      let dx = 0, dy = 0;
      if (prev) {
        const prevXY = proj.toXY(prev);
        const ddx = head.x - prevXY.x, ddy = head.y - prevXY.y;
        const len = Math.hypot(ddx, ddy);
        if (len > 0.5) {
          dx = (ddx / len) * 40;
          dy = (ddy / len) * 40;
          bearing.value = withTiming((Math.atan2(ddx, -ddy) * 180) / Math.PI, { duration: 600 });
        }
      }
      prev = p;
      const k = scale.value;
      tx.value = withTiming(-(head.x + dx) * k, { duration: 950, easing: Easing.linear });
      ty.value = withTiming(-(head.y + dy) * k, { duration: 950, easing: Easing.linear });
      lookX.value = withTiming(-dx * k, { duration: 950, easing: Easing.linear });
      lookY.value = withTiming(-dy * k, { duration: 950, easing: Easing.linear });
    });
    return unsub;
  }, [follow, anchor, scale, tx, ty, lookX, lookY, bearing]);

  // gestes
  const pinch = Gesture.Pinch()
    .enabled(interactive)
    .onUpdate((e) => {
      'worklet';
      const next = Math.min(SCALE_MAX, Math.max(SCALE_MIN, savedScale.value * e.scale));
      // garde le point sous la caméra : t varie proportionnellement
      const f = next / scale.value;
      tx.value *= f;
      ty.value *= f;
      scale.value = next;
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const pan = Gesture.Pan()
    .enabled(interactive && !follow)
    .onStart(() => {
      'worklet';
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      'worklet';
      const bound = (CANVAS / 2) * scale.value;
      tx.value = Math.min(bound, Math.max(-bound, savedTx.value + e.translationX));
      ty.value = Math.min(bound, Math.max(-bound, savedTy.value + e.translationY));
    });

  // hit-test côté JS (rues/trails/cellules)
  const handleTap = (wx: number, wy: number) => {
    if (!onInspect) return;
    const proj = projectionFor(anchor);
    const geo = proj.toGeo({ x: wx, y: wy });
    const world = getWorld(anchor);
    // trail le plus proche (< 40 m)
    let best: PaintedTrail | null = null;
    let bestD = 40;
    for (const t of useTerritoryStore.getState().trails) {
      for (const p of t.points) {
        const q = proj.toXY(p);
        const dM = Math.hypot(q.x - wx, q.y - wy) * 2.2;
        if (dM < bestD) {
          bestD = dM;
          best = t;
        }
      }
    }
    const h3 = latLngToCell(geo.lat, geo.lon, H3_RES);
    const cell = useTerritoryStore.getState().ownerOf(h3);
    if (!best && !cell.owner) return; // tap dans le vide → rien
    onInspect({ geo, streetName: world.nearestStreet(geo).name, trail: best, cell });
  };

  const tap = Gesture.Tap()
    .enabled(interactive && !!onInspect)
    .onEnd((e) => {
      'worklet';
      // tap écran → monde px → hit-test délégué au thread JS
      const wx = (e.x - cx - tx.value) / scale.value;
      const wy = (e.y - cy - ty.value) / scale.value;
      runOnJS(handleTap)(wx, wy);
    });

  const composed = Gesture.Race(tap, Gesture.Simultaneous(pinch, pan));

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  const hexStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [LOD_LOW, LOD_HIGH], [1, 0], 'clamp'),
  }));
  const veinsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [LOD_LOW, LOD_HIGH], [0.25, 1], 'clamp'),
  }));
  const cursorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX.value }, { translateY: lookY.value }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bearing.value}deg` }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.35 }],
    opacity: 0.3 - breathe.value * 0.15,
  }));

  const teamColor = TEAMS[team].color;
  const canvasLeft = cx - CANVAS / 2;
  const canvasTop = cy - CANVAS / 2;
  const vb = `${-CANVAS / 2} ${-CANVAS / 2} ${CANVAS} ${CANVAS}`;

  return (
    <View
      style={styles.root}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <GestureDetector gesture={composed}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Animated.View
            style={[{ position: 'absolute', left: canvasLeft, top: canvasTop, width: CANVAS, height: CANVAS }, cameraStyle]}>
            <Svg width={CANVAS} height={CANVAS} viewBox={vb}>
              <CityBase anchor={anchor} dark={dark} />
            </Svg>
            <Animated.View style={[StyleSheet.absoluteFill, hexStyle]} pointerEvents="none">
              <Svg width={CANVAS} height={CANVAS} viewBox={vb}>
                <TerritoryHexes anchor={anchor} cells={cells} version={version} dark={dark} />
              </Svg>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, veinsStyle]} pointerEvents="none">
              <Svg width={CANVAS} height={CANVAS} viewBox={vb}>
                <TerritoryVeins anchor={anchor} trails={trails} version={version} dark={dark} />
                <BotsLayer anchor={anchor} bots={bots} showNames={!follow} dark={dark} />
                {drop && <DropMarker anchor={anchor} drop={drop} />}
                <MyTrail anchor={anchor} trail={trail} dark={dark} />
                {/* point « moi » statique quand on ne court pas */}
                {!follow && trail.length === 0 && (
                  <G>
                    <Circle cx={0} cy={0} r={10} fill={teamColor} opacity={0.25} />
                    <Circle cx={0} cy={0} r={6} fill={teamColor} stroke="#FFFFFF" strokeWidth={2.2} />
                  </G>
                )}
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* curseur GPS fixe au centre — la ville défile dessous */}
      {follow && (
        <Animated.View pointerEvents="none" style={[styles.cursor, { left: cx - 28, top: cy - 28 }, cursorStyle]}>
          <Animated.View style={[styles.halo, { backgroundColor: teamColor }, haloStyle]} />
          <Animated.View style={[styles.arrowWrap, arrowStyle]}>
            <View style={[styles.arrowBody, { backgroundColor: teamColor }]}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M12 3l7 16-7-4-7 4z" fill="#FFFFFF" />
              </Svg>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

function DropMarker({ anchor, drop }: { anchor: LatLon; drop: Drop }) {
  const proj = projectionFor(anchor);
  const c = proj.toXY(drop.center);
  const r = drop.radiusM / 2.2;
  return (
    <G>
      <Circle cx={c.x} cy={c.y} r={r} fill="#F5B82E" fillOpacity={0.13} stroke="#F5B82E" strokeWidth={2} strokeDasharray="6 5" />
      <Circle cx={c.x} cy={c.y} r={13} fill="#F5B82E" opacity={0.95} />
      <Circle cx={c.x} cy={c.y} r={13} fill="none" stroke="#FFFFFF" strokeWidth={2.2} />
    </G>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  cursor: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  arrowWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  arrowBody: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 }
      : {}),
  },
});
