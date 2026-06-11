// Fond de carte RÉEL — les vraies rues sous les calques de jeu (lot « carte »).
// Tuiles raster Web-Mercator posées dans le repère monde existant via la même
// projection équirectangulaire que les autres calques → veines, hexagones et
// trace GPS restent exactement alignés. 100 % JS (expo-image) : fonctionne
// dans Expo Go, contrairement au SDK natif Mapbox (réservé à un futur dev build).
// Source : raster Mapbox si EXPO_PUBLIC_MAPBOX_TOKEN (pk.*) est posé,
// sinon CARTO/OpenStreetMap sans clé. Attribution affichée par MapView.
//
// Deux couches :
//   1. socle — tout le canvas au zoom du dézoom max (~9 tuiles, toujours
//      montées) : jamais de trou pendant un pan/zoom rapide ;
//   2. détail — tuiles du viewport au zoom adapté à l'échelle caméra,
//      recalculées de façon throttlée (useAnimatedReaction → runOnJS).

import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { makeProjection, type LatLon } from '../../lib/world';
import { HALF, M_PER_PX, SCALE_MIN } from './mapShared';

// ---- source de tuiles -------------------------------------------------------
const RAW_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
/** token réellement utilisable (pas le placeholder `pk.xxxxx` du .env.default) */
const MAPBOX_TOKEN = RAW_TOKEN.startsWith('pk.') && !RAW_TOKEN.includes('xxxxx') ? RAW_TOKEN : null;

// Styles Mapbox au format `username/styleId` — surchargeables pour brancher les
// styles custom dessinés dans Mapbox Studio (backlog 0.2) sans toucher au code.
const STYLE_DARK = process.env.EXPO_PUBLIC_MAPBOX_STYLE_DARK ?? 'mapbox/dark-v11';
const STYLE_LIGHT = process.env.EXPO_PUBLIC_MAPBOX_STYLE_LIGHT ?? 'mapbox/light-v11';

export const BASEMAP_ATTRIBUTION = MAPBOX_TOKEN
  ? '© Mapbox © OpenStreetMap'
  : '© OpenStreetMap contributors © CARTO';

function tileUrl(z: number, x: number, y: number, dark: boolean): string {
  if (MAPBOX_TOKEN) {
    const style = dark ? STYLE_DARK : STYLE_LIGHT;
    return `https://api.mapbox.com/styles/v1/${style}/tiles/256/${z}/${x}/${y}@2x?access_token=${MAPBOX_TOKEN}`;
  }
  const sub = 'abcd'[(x + y) % 4];
  return `https://${sub}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/${z}/${x}/${y}@2x.png`;
}

// ---- maths Web Mercator -----------------------------------------------------
const EARTH_M = 40075016.686;
const MAX_LAT = 85.0511;
const Z_MIN = 13;
const Z_MAX = 18;

const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat: number, z: number) => {
  const r = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};
const xToLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const yToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

/** largeur au sol (m) d'une tuile 256 px à cette latitude */
const tileGroundM = (z: number, lat: number) => (EARTH_M * Math.cos((lat * Math.PI) / 180)) / 2 ** z;

/** plus petit zoom dont la tuile s'affiche ≤ 255 px écran (netteté rétina, source @2x) */
function zoomFor(scale: number, lat: number): number {
  for (let z = Z_MIN; z <= Z_MAX; z++) {
    if ((tileGroundM(z, lat) / M_PER_PX) * scale <= 255) return z;
  }
  return Z_MAX;
}

type Tile = { key: string; z: number; x: number; y: number; left: number; top: number; w: number; h: number };

/** tuiles couvrant un rect monde-px (repère canvas centré), borné au canvas */
function tilesFor(anchor: LatLon, z: number, rect: { x0: number; y0: number; x1: number; y1: number }): Tile[] {
  const proj = makeProjection(anchor, M_PER_PX);
  const x0 = Math.max(-HALF, rect.x0);
  const y0 = Math.max(-HALF, rect.y0);
  const x1 = Math.min(HALF, rect.x1);
  const y1 = Math.min(HALF, rect.y1);
  if (x1 <= x0 || y1 <= y0) return [];
  const nw = proj.toGeo({ x: x0, y: y0 });
  const se = proj.toGeo({ x: x1, y: y1 });
  const colMin = Math.floor(lonToX(nw.lon, z));
  const colMax = Math.floor(lonToX(se.lon, z));
  const rowMin = Math.floor(latToY(nw.lat, z));
  const rowMax = Math.floor(latToY(se.lat, z));
  const last = 2 ** z - 1;
  const tiles: Tile[] = [];
  for (let row = Math.max(0, rowMin); row <= Math.min(last, rowMax); row++) {
    for (let col = Math.max(0, colMin); col <= Math.min(last, colMax); col++) {
      // coins géo réels de la tuile reprojetés → les tuiles adjacentes
      // partagent exactement leurs bords (pas de dérive Mercator/équirect)
      const p1 = proj.toXY({ lat: yToLat(row, z), lon: xToLon(col, z) });
      const p2 = proj.toXY({ lat: yToLat(row + 1, z), lon: xToLon(col + 1, z) });
      tiles.push({
        key: `${z}/${col}/${row}`,
        z,
        x: col,
        y: row,
        left: p1.x + HALF,
        top: p1.y + HALF,
        // +0,5 px de recouvrement : tue les liserés d'arrondi entre tuiles
        w: p2.x - p1.x + 0.5,
        h: p2.y - p1.y + 0.5,
      });
    }
  }
  return tiles;
}

type Props = {
  anchor: LatLon;
  dark: boolean;
  /** caméra MapView (valeurs partagées reanimated) */
  scale: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  viewW: number;
  viewH: number;
  initialScale?: number;
};

export const RealBasemap = React.memo(function RealBasemap({
  anchor,
  dark,
  scale,
  tx,
  ty,
  viewW,
  viewH,
  initialScale = 1,
}: Props) {
  const [cam, setCam] = useState({ s: initialScale, x: 0, y: 0 });
  const lastS = useSharedValue(initialScale);
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);

  const commit = useCallback((s: number, x: number, y: number) => setCam({ s, x, y }), []);

  // throttle : on ne recalcule la grille que quand la caméra a bougé assez
  useAnimatedReaction(
    () => [scale.value, tx.value, ty.value] as const,
    ([s, x, y]) => {
      const ds = Math.abs(s - lastS.value) / Math.max(0.01, lastS.value);
      const moved = Math.abs(x - lastX.value) + Math.abs(y - lastY.value);
      if (ds > 0.06 || moved > 48) {
        lastS.value = s;
        lastX.value = x;
        lastY.value = y;
        runOnJS(commit)(s, x, y);
      }
    },
  );

  const baseZ = zoomFor(SCALE_MIN, anchor.lat);

  // socle : tout le canvas — toujours monté, jamais de trou
  const baseTiles = useMemo(
    () => tilesFor(anchor, baseZ, { x0: -HALF, y0: -HALF, x1: HALF, y1: HALF }),
    [anchor, baseZ],
  );

  // détail : viewport courant (+30 % de marge) au zoom adapté à l'échelle
  const detailTiles = useMemo(() => {
    const z = zoomFor(cam.s, anchor.lat);
    if (z <= baseZ) return []; // déjà couvert par le socle
    const hw = viewW / 2 / cam.s;
    const hh = viewH / 2 / cam.s;
    const cxw = -cam.x / cam.s; // centre écran en monde-px
    const cyw = -cam.y / cam.s;
    const mx = hw * 0.3;
    const my = hh * 0.3;
    return tilesFor(anchor, z, { x0: cxw - hw - mx, y0: cyw - hh - my, x1: cxw + hw + mx, y1: cyw + hh + my });
  }, [anchor, baseZ, cam, viewW, viewH]);

  const theme = dark ? 'd' : 'l';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {baseTiles.map((t) => (
        <Image
          key={`${t.key}-${theme}`}
          source={tileUrl(t.z, t.x, t.y, dark)}
          style={[styles.tile, { left: t.left, top: t.top, width: t.w, height: t.h }]}
          contentFit="fill"
          cachePolicy="memory-disk"
          transition={150}
        />
      ))}
      {detailTiles.map((t) => (
        <Image
          key={`${t.key}-${theme}`}
          source={tileUrl(t.z, t.x, t.y, dark)}
          style={[styles.tile, { left: t.left, top: t.top, width: t.w, height: t.h }]}
          contentFit="fill"
          cachePolicy="memory-disk"
          transition={120}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  tile: { position: 'absolute' },
});
