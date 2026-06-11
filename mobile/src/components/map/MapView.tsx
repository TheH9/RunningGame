// MapView — point d'entrée unique de la carte, à deux moteurs :
//   · NativeMap (@rnmapbox/maps, vecteur) quand le module natif est présent
//     dans le binaire (dev/standalone build) ET qu'un token pk.* est posé ;
//   · RasterMap (tuiles raster + calques SVG) partout ailleurs — Expo Go,
//     web, build sans token. Mêmes props, mêmes calques de jeu.
// Le require de NativeMap est conditionnel : dans Expo Go le module natif
// n'existe pas et son code n'est jamais exécuté.

import React from 'react';
import { useNativeMap } from './mapboxConfig';
import type { MapProps } from './mapShared';
import { RasterMap } from './RasterMap';

export type { InspectInfo, MapProps } from './mapShared';

let NativeMapComp: React.ComponentType<MapProps> | null = null;
if (useNativeMap) {
  try {
    NativeMapComp = (require('./NativeMap') as typeof import('./NativeMap')).NativeMap;
  } catch {
    NativeMapComp = null; // module natif absent ou incompatible → raster
  }
}

export function MapView(props: MapProps) {
  const Comp = NativeMapComp ?? RasterMap;
  return <Comp {...props} />;
}
