// Rendu natif @rnmapbox/maps — la carte « premium » (vecteur, 60 fps).
// Chargé UNIQUEMENT quand le module natif est présent (dev build) ET qu'un
// token pk.* est posé (mapboxConfig.useNativeMap) ; sinon RasterMap prend le
// relais. Mêmes props, mêmes calques de jeu portés en couches GL :
//   hexagones H3 (dézoom) ↔ veines (zoom) avec le même crossfade LOD que le
//   raster (zoomFromScale), trace-comète du run, drop, curseur de suivi.

import Mapbox, {
  Camera, CircleLayer, FillLayer, LineLayer, MapView as MBMapView, ShapeSource,
} from '@rnmapbox/maps';
import type { Feature, FeatureCollection } from 'geojson';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { getBackend } from '../../backend/GameBackend';
import type { Drop, PaintedTrail } from '../../backend/types';
import type { GeoPoint } from '../../lib/geo';
import { cellPolygon, cellView } from '../../lib/territory';
import { DEFAULT_ANCHOR, type LatLon } from '../../lib/world';
import { useAppStore } from '../../store/useAppStore';
import { useRunStore } from '../../store/useRunStore';
import { useTerritoryStore } from '../../store/useTerritoryStore';
import { map as M, TEAMS, type TeamSlug } from '../../theme/tokens';
import { inspectAt } from './inspectAt';
import { MAPBOX_TOKEN, styleUrlFor } from './mapboxConfig';
import { LOD_HIGH, LOD_LOW, SCALE_MAX, SCALE_MIN, zoomFromScale, type MapProps } from './mapShared';
import { RunCursor } from './RunCursor';

if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
  Mapbox.setTelemetryEnabled(false); // cohérent avec PRIVACY.md : zéro télémétrie
}

const M_PER_DEG_LAT = 110574;
const mPerDegLon = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

// — buckets de fraîcheur des veines (mêmes valeurs que TerritoryVeins SVG) —
const FRESH_MS = 5 * 60 * 1000;
const RECENT_MS = 3 * 24 * 3600 * 1000;
const BUCKET_STYLE = {
  fresh: { haloW: 11, haloO: 0.38, coreW: 3.2, coreO: 1 },
  recent: { haloW: 8, haloO: 0.16, coreW: 2.4, coreO: 0.65 },
  old: { haloW: 6, haloO: 0.07, coreW: 2, coreO: 0.34 },
} as const;

const fc = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features });
const line = (pts: { lat: number; lon: number }[], properties: Record<string, unknown>): Feature => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: pts.map((p) => [p.lon, p.lat]) },
  properties,
});
const point = (p: { lat: number; lon: number }, properties: Record<string, unknown> = {}): Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
  properties,
});

/** cercle géodésique approx (pour le drop) */
function circlePolygon(center: LatLon, radiusM: number): Feature {
  const kLon = mPerDegLon(center.lat);
  const ring: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    ring.push([center.lon + (Math.cos(a) * radiusM) / kLon, center.lat + (Math.sin(a) * radiusM) / M_PER_DEG_LAT]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} };
}

export function NativeMap({
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
  const cameraRef = useRef<Camera>(null);
  const bearing = useSharedValue(0);

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

  // — repères de zoom partagés avec le raster (LOD + cadrage) —
  const zBase = zoomFromScale(1, anchor.lat);
  const zLow = zoomFromScale(LOD_LOW, anchor.lat);
  const zHigh = zoomFromScale(LOD_HIGH, anchor.lat);
  const initialZoom = zoomFromScale(initialScale, anchor.lat);

  // largeur de trait « ancrée au monde » : double à chaque niveau de zoom
  const worldWidth = (prop: string) => [
    'interpolate', ['exponential', 2], ['zoom'],
    zBase - 3, ['*', ['get', prop], 0.125],
    zBase + 3, ['*', ['get', prop], 8],
  ];
  const lodHex = ['interpolate', ['linear'], ['zoom'], zLow, 1, zHigh, 0];
  const lodVeins = ['interpolate', ['linear'], ['zoom'], zLow, 0.25, zHigh, 1];

  // recadrage hors course (1er affichage + ré-ancrage à la localisation)
  useEffect(() => {
    if (follow) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [anchor.lon, anchor.lat],
      zoomLevel: zoomFromScale(initialScale, anchor.lat),
      animationDuration: 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.lat, anchor.lon, follow]);

  // suivi du coureur : la caméra glisse vers la tête de trace (+ lookahead)
  useEffect(() => {
    if (!follow) return;
    let prev: GeoPoint | null = null;
    const unsub = useRunStore.subscribe((s) => {
      const p = s.lastPoint;
      if (!p || p === prev) return;
      const kLon = mPerDegLon(p.lat);
      let center: [number, number] = [p.lon, p.lat];
      if (prev) {
        const dxM = (p.lon - prev.lon) * kLon;
        const dyM = (p.lat - prev.lat) * M_PER_DEG_LAT;
        const len = Math.hypot(dxM, dyM);
        if (len > 1) {
          const aheadM = 88; // même anticipation que le raster (40 px monde)
          center = [p.lon + ((dxM / len) * aheadM) / kLon, p.lat + ((dyM / len) * aheadM) / M_PER_DEG_LAT];
          bearing.value = withTiming((Math.atan2(dxM, dyM) * 180) / Math.PI, { duration: 600 });
        }
      }
      prev = p;
      cameraRef.current?.setCamera({ centerCoordinate: center, animationDuration: 950, animationMode: 'linearTo' });
    });
    return unsub;
  }, [follow, bearing]);

  // — sources GeoJSON (recalculées sur version / thème) —
  const dimVeins = dark ? 1 : 0.85;
  const dimHex = dark ? 0.85 : 1;

  const cellsShape = useMemo(() => {
    const now = Date.now();
    const features: Feature[] = [];
    for (const c of cells.values()) {
      const v = cellView(c, now);
      if (!v.owner) continue;
      const ring = cellPolygon(c.h3).map((p) => [p.lon, p.lat]);
      ring.push(ring[0]);
      const contested = !!(v.contested && v.challenger);
      const bucket = v.strength > 0.66 ? 2 : v.strength > 0.33 ? 1 : 0;
      const opacity = contested
        ? 0.12 * dimHex
        : [0.14, 0.26, 0.4][bucket] * (v.fading ? 0.5 : 1) * dimHex;
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {
          color: TEAMS[v.owner].color,
          challengerColor: contested ? TEAMS[v.challenger as TeamSlug].color : TEAMS[v.owner].color,
          opacity,
          lineOpacity: contested ? 0.8 : Math.min(0.6, opacity * 2),
          contested,
        },
      });
    }
    return fc(features);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, dimHex, cells]);

  const veinsShape = useMemo(() => {
    const now = Date.now();
    const features: Feature[] = [];
    for (const t of trails as PaintedTrail[]) {
      if (t.points.length < 2) continue;
      const age = now - t.paintedAt;
      const b = BUCKET_STYLE[age < FRESH_MS ? 'fresh' : age < RECENT_MS ? 'recent' : 'old'];
      features.push(
        line(t.points, {
          color: TEAMS[t.team].color,
          haloW: b.haloW, haloO: b.haloO * dimVeins,
          coreW: b.coreW, coreO: b.coreO * dimVeins,
        }),
      );
    }
    return fc(features);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, dimVeins, trails]);

  const myTrailShape = useMemo(() => {
    if (trail.length < 2) return fc([]);
    const features = [line(trail, { kind: 'full' })];
    if (trail.length >= 2) features.push(line(trail.slice(Math.max(0, trail.length - 6)), { kind: 'hot' }));
    features.push(point(trail[0], { kind: 'start' }));
    return fc(features);
  }, [trail]);

  const dropShape = useMemo(() => {
    if (!drop) return fc([]);
    return fc([circlePolygon(drop.center, drop.radiusM), point(drop.center, { kind: 'center' })]);
  }, [drop]);

  const meShape = useMemo(() => fc([point(anchor)]), [anchor]);

  const teamColor = TEAMS[team].color;
  const cx = size.w / 2;
  const cy = size.h / 2;

  return (
    <View
      style={styles.root}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <MBMapView
        style={StyleSheet.absoluteFill}
        styleURL={styleUrlFor(dark)}
        scaleBarEnabled={false}
        compassEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={interactive && !follow}
        zoomEnabled={interactive}
        onPress={(e) => {
          if (!interactive || !onInspect) return;
          const g = e.geometry;
          if (g.type === 'Point') inspectAt({ lon: g.coordinates[0], lat: g.coordinates[1] }, onInspect);
        }}>
        <Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: [anchor.lon, anchor.lat], zoomLevel: initialZoom }}
          minZoomLevel={zoomFromScale(SCALE_MIN, anchor.lat) - 1}
          maxZoomLevel={zoomFromScale(SCALE_MAX, anchor.lat) + 2.5}
        />

        {/* hexagones H3 — vue plateau au dézoom (fondu LOD inverse des veines) */}
        <ShapeSource id="cells" shape={cellsShape}>
          <FillLayer
            id="cells-fill"
            style={{ fillColor: ['get', 'color'], fillOpacity: ['*', ['get', 'opacity'], lodHex] } as any}
          />
          <LineLayer
            id="cells-outline"
            filter={['!', ['get', 'contested']] as any}
            style={{
              lineColor: ['get', 'color'],
              lineOpacity: ['*', ['get', 'lineOpacity'], lodHex],
              lineWidth: 1,
            } as any}
          />
          <LineLayer
            id="cells-contested-owner"
            filter={['get', 'contested'] as any}
            style={{
              lineColor: ['get', 'color'],
              lineOpacity: ['*', 0.8, lodHex],
              lineWidth: 1.6,
              lineDasharray: [3, 3],
            } as any}
          />
          <LineLayer
            id="cells-contested-challenger"
            filter={['get', 'contested'] as any}
            style={{
              lineColor: ['get', 'challengerColor'],
              lineOpacity: ['*', 0.8, lodHex],
              lineWidth: 1.2,
              lineDasharray: [1, 5],
            } as any}
          />
        </ShapeSource>

        {/* veines — traces peintes, halo + cœur, opacité LOD */}
        <ShapeSource id="veins" shape={veinsShape}>
          <LineLayer
            id="veins-halo"
            style={{
              lineColor: ['get', 'color'],
              lineOpacity: ['*', ['get', 'haloO'], lodVeins],
              lineWidth: worldWidth('haloW'),
              lineCap: 'round',
              lineJoin: 'round',
            } as any}
          />
          <LineLayer
            id="veins-core"
            style={{
              lineColor: ['get', 'color'],
              lineOpacity: ['*', ['get', 'coreO'], lodVeins],
              lineWidth: worldWidth('coreW'),
              lineCap: 'round',
              lineJoin: 'round',
            } as any}
          />
        </ShapeSource>

        {/* drop actif — zone dorée pointillée */}
        <ShapeSource id="drop" shape={dropShape}>
          <FillLayer
            id="drop-fill"
            filter={['==', ['geometry-type'], 'Polygon'] as any}
            style={{ fillColor: '#F5B82E', fillOpacity: 0.13 } as any}
          />
          <LineLayer
            id="drop-outline"
            filter={['==', ['geometry-type'], 'Polygon'] as any}
            style={{ lineColor: '#F5B82E', lineWidth: 2, lineDasharray: [3, 2.5] } as any}
          />
          <CircleLayer
            id="drop-center"
            filter={['==', ['geometry-type'], 'Point'] as any}
            style={{
              circleColor: '#F5B82E',
              circleRadius: 13,
              circleOpacity: 0.95,
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 2.2,
            } as any}
          />
        </ShapeSource>

        {/* ma trace en cours — comète : halo + cœur + tête chaude + départ */}
        <ShapeSource id="my-trail" shape={myTrailShape}>
          <LineLayer
            id="trail-halo"
            filter={['==', ['get', 'kind'], 'full'] as any}
            style={{ lineColor: M.trailHalo, lineOpacity: 0.5, lineWidth: 13, lineCap: 'round', lineJoin: 'round' } as any}
          />
          <LineLayer
            id="trail-core"
            filter={['==', ['get', 'kind'], 'full'] as any}
            style={{ lineColor: M.trailCore, lineWidth: 4.5, lineCap: 'round', lineJoin: 'round' } as any}
          />
          <LineLayer
            id="trail-hot"
            filter={['==', ['get', 'kind'], 'hot'] as any}
            style={{ lineColor: M.trailHot, lineOpacity: 0.9, lineWidth: 4.5, lineCap: 'round', lineJoin: 'round' } as any}
          />
          <CircleLayer
            id="trail-start"
            filter={['==', ['get', 'kind'], 'start'] as any}
            style={{
              circleColor: dark ? '#0E1116' : '#FFFFFF',
              circleRadius: 4,
              circleStrokeColor: M.trailCore,
              circleStrokeWidth: 2.4,
            } as any}
          />
        </ShapeSource>

        {/* point « moi » statique quand on ne court pas */}
        {!follow && trail.length === 0 && (
          <ShapeSource id="me" shape={meShape}>
            <CircleLayer
              id="me-halo"
              style={{ circleColor: teamColor, circleRadius: 10, circleOpacity: 0.25 } as any}
            />
            <CircleLayer
              id="me-dot"
              style={{ circleColor: teamColor, circleRadius: 6, circleStrokeColor: '#FFFFFF', circleStrokeWidth: 2.2 } as any}
            />
          </ShapeSource>
        )}
      </MBMapView>

      {/* curseur GPS fixe au centre — la caméra anticipe, le curseur reste */}
      {follow && <RunCursor teamColor={teamColor} bearing={bearing} cx={cx} cy={cy} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
});
