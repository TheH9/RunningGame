// Sources de position interchangeables : GPS réel (expo-location) en
// production, replay simulé pour les tests. Le moteur de run ne sait pas la
// différence.

import type { GeoPoint } from './geo';
import { haversine } from './geo';

export interface LocationSource {
  /** démarre le flux ; résout false si la permission est refusée */
  start(onPoint: (p: GeoPoint) => void): Promise<boolean>;
  stop(): void;
  readonly kind: 'gps' | 'replay';
}

export class GpsSource implements LocationSource {
  readonly kind = 'gps' as const;
  private sub: { remove(): void } | null = null;

  async start(onPoint: (p: GeoPoint) => void): Promise<boolean> {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    this.sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        onPoint({
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          t: loc.timestamp,
          accuracy: loc.coords.accuracy ?? undefined,
        });
      },
    );
    return true;
  }

  stop() {
    this.sub?.remove();
    this.sub = null;
  }
}

/** Rejoue une route à allure de course, avec un peu de bruit GPS réaliste. */
export class ReplaySource implements LocationSource {
  readonly kind = 'replay' as const;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: GeoPoint[],
    private speedKmh = 11,
    private jitterM = 3,
    private intervalMs = 1000,
  ) {}

  async start(onPoint: (p: GeoPoint) => void): Promise<boolean> {
    if (this.route.length < 2) return false;
    const mPerTick = (this.speedKmh * 1000 / 3600) * (this.intervalMs / 1000);
    let idx = 0;       // segment courant
    let along = 0;     // mètres parcourus sur ce segment
    this.timer = setInterval(() => {
      // avance le long de la polyligne à vitesse constante, AVEC interpolation
      let budget = mPerTick;
      let segLen = haversine(this.route[idx], this.route[idx + 1]);
      while (along + budget >= segLen && idx < this.route.length - 2) {
        budget -= segLen - along;
        along = 0;
        idx++;
        segLen = haversine(this.route[idx], this.route[idx + 1]);
      }
      along = Math.min(along + budget, segLen);
      const a = this.route[idx], b = this.route[idx + 1];
      const f = segLen > 0 ? along / segLen : 1;
      const lat = a.lat + (b.lat - a.lat) * f;
      const lon = a.lon + (b.lon - a.lon) * f;
      const jLat = ((Math.random() - 0.5) * 2 * this.jitterM) / 110574;
      const jLon = ((Math.random() - 0.5) * 2 * this.jitterM) / (111320 * Math.cos((lat * Math.PI) / 180));
      onPoint({ lat: lat + jLat, lon: lon + jLon, t: Date.now(), accuracy: 5 });
      if (idx >= this.route.length - 2 && along >= segLen) this.stop();
    }, this.intervalMs);
    return true;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
