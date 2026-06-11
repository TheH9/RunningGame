// Rendu raster — repli universel (Expo Go, web, build sans token Mapbox).
// Caméra = transform GPU sur la View englobante (zéro re-rendu SVG en
// mouvement). Fond = vraies rues (RealBasemap, tuiles raster). Pinch-zoom avec
// fondu LOD veines↔hexagones (ADR-003), suivi du coureur façon GPS (curseur
// fixe, la ville défile), tap d'inspection via le hit-test partagé.

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { getBackend } from '../../backend/GameBackend';
import type { Drop } from '../../backend/types';
import type { GeoPoint } from '../../lib/geo';
import { DEFAULT_ANCHOR, type LatLon } from '../../lib/world';
import { useAppStore } from '../../store/useAppStore';
import { useRunStore } from '../../store/useRunStore';
import { useTerritoryStore } from '../../store/useTerritoryStore';
import { TEAMS } from '../../theme/tokens';
import { inspectAt } from './inspectAt';
import { BASEMAP_ATTRIBUTION } from './mapboxConfig';
import {
  CANVAS, LOD_HIGH, LOD_LOW, MAP_DARK, MAP_LIGHT, projectionFor, SCALE_MAX, SCALE_MIN,
  type MapProps,
} from './mapShared';
import { MyTrail } from './MyTrail';
import { RealBasemap } from './RealBasemap';
import { RunCursor } from './RunCursor';
import { TerritoryHexes } from './TerritoryHexes';
import { TerritoryVeins } from './TerritoryVeins';

export function RasterMap({
  dark = false,
  team = 'vagues',
  trail = [],
  interactive = true,
  follow = false,
  onInspect,
  initialScale = 1,
}: MapProps) {
  const anchor = useAppStore((s) => s.worldAnchor) ?? DEFAULT_ANCHOR;
  const version = useTerritoryStore((s) => s.version);
  const trails = useTerritoryStore((s) => s.trails);
  const cells = useTerritoryStore((s) => s.cells);

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
      // zoom ancré sous les doigts (point focal) : le point du monde sous le
      // focal reste sous le focal pendant le pinch.
      const lx = (e.focalX - cx - tx.value) / scale.value;
      const ly = (e.focalY - cy - ty.value) / scale.value;
      tx.value = e.focalX - cx - lx * next;
      ty.value = e.focalY - cy - ly * next;
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
      // borne = demi-contenu zoomé moins la demi-fenêtre : empêche de tirer la
      // carte dans le vide (le contenu couvre toujours l'écran).
      const boundX = Math.max(0, (CANVAS / 2) * scale.value - cx);
      const boundY = Math.max(0, (CANVAS / 2) * scale.value - cy);
      tx.value = Math.min(boundX, Math.max(-boundX, savedTx.value + e.translationX));
      ty.value = Math.min(boundY, Math.max(-boundY, savedTy.value + e.translationY));
    });

  // hit-test délégué au module partagé
  const handleTap = (wx: number, wy: number) => {
    if (!onInspect) return;
    const geo = projectionFor(anchor).toGeo({ x: wx, y: wy });
    inspectAt(geo, onInspect);
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
            style={[
              { position: 'absolute', left: canvasLeft, top: canvasTop, width: CANVAS, height: CANVAS },
              { backgroundColor: (dark ? MAP_DARK : MAP_LIGHT).land },
              cameraStyle,
            ]}>
            <RealBasemap
              anchor={anchor}
              dark={dark}
              scale={scale}
              tx={tx}
              ty={ty}
              viewW={size.w}
              viewH={size.h}
              initialScale={initialScale}
            />
            <Animated.View style={[StyleSheet.absoluteFill, hexStyle]} pointerEvents="none">
              <Svg width={CANVAS} height={CANVAS} viewBox={vb}>
                <TerritoryHexes anchor={anchor} cells={cells} version={version} dark={dark} />
              </Svg>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, veinsStyle]} pointerEvents="none">
              <Svg width={CANVAS} height={CANVAS} viewBox={vb}>
                <TerritoryVeins anchor={anchor} trails={trails} version={version} dark={dark} />
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

      {/* attribution légale du fond de carte */}
      <Text
        pointerEvents="none"
        style={[styles.attribution, { color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(31,41,55,0.4)' }]}>
        {BASEMAP_ATTRIBUTION}
      </Text>

      {/* curseur GPS fixe au centre — la ville défile dessous */}
      {follow && <RunCursor teamColor={teamColor} bearing={bearing} lookX={lookX} lookY={lookY} cx={cx} cy={cy} />}
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
  attribution: { position: 'absolute', right: 8, bottom: 5, fontSize: 9, fontWeight: '600' },
});
