// ShareCard — le moment viral (maquette 05 ⭐) : carte d'histoire 9:16.
// La trace se dessine seule (strokeDashoffset animé), le curseur la suit,
// la surface peinte défile. Capturable → partage en Story (docs/08, lot viral).

import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { GeoPoint } from '@/lib/geo';
import { TEAMS, type TeamSlug } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

const VB_W = 360;
const VB_H = 640; // 9:16

type Pt = { x: number; y: number };

function smooth(p: Pt[]): string {
  if (p.length < 2) return '';
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Projette la trace GPS et la cadre dans la zone centrale de la carte.
function fitTrack(points: GeoPoint[]): Pt[] {
  if (points.length < 2) return [];
  const o = points[0];
  const k = Math.cos((o.lat * Math.PI) / 180);
  const raw = points.map((p) => ({
    x: (p.lon - o.lon) * 111320 * k,
    y: -(p.lat - o.lat) * 110574,
  }));
  const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const pad = 70;
  const scale = Math.min((VB_W - pad * 2) / w, (VB_H - 230 - pad * 2) / h);
  const offX = (VB_W - w * scale) / 2 - minX * scale;
  const offY = 150 + ((VB_H - 230 - h * scale) / 2) - minY * scale;
  return raw.map((p) => ({ x: p.x * scale + offX, y: p.y * scale + offY }));
}

// longueur approx. du tracé écran (pour le strokeDasharray)
function pathLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

type Props = {
  points: GeoPoint[];
  team: TeamSlug;
  paintedKm: string;
  distanceKm: string;
  duration: string;
  pace: string;
  pseudo: string;
};

export function ShareCard({ points, team, paintedKm, distanceKm, duration, pace, pseudo }: Props) {
  const t = TEAMS[team];
  const screen = useMemo(() => fitTrack(points), [points]);
  const d = screen.length >= 2 ? smooth(screen) : '';
  const len = useMemo(() => pathLength(screen), [screen]);
  const head = screen[screen.length - 1];

  const progress = useSharedValue(0); // 0→1 dessine la trace
  const [shownKm, setShownKm] = useState('0,00');

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.cubic) });
    // count-up de la surface peinte
    const target = parseFloat(paintedKm.replace(',', '.')) || 0;
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 2200);
      const eased = 1 - Math.pow(1 - k, 3);
      setShownKm((eased * target).toFixed(2).replace('.', ','));
      if (k >= 1) clearInterval(id);
    }, 33);
    return () => clearInterval(id);
  }, [paintedKm, progress]);

  const dashProps = useAnimatedProps(() => ({
    strokeDashoffset: len * (1 - progress.value),
  }));
  // le curseur avance le long de la trace (approx. par index)
  const cursorProps = useAnimatedProps(() => {
    const idx = Math.min(screen.length - 1, Math.floor(progress.value * (screen.length - 1)));
    const p = screen[idx] ?? head ?? { x: VB_W / 2, y: VB_H / 2 };
    return { opacity: progress.value > 0.04 ? 1 : 0, transform: [{ translateX: p.x }, { translateY: p.y }] };
  });

  return (
    <View style={styles.card}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0E1116" />
            <Stop offset="1" stopColor="#141B26" />
          </LinearGradient>
        </Defs>
        <Rect width={VB_W} height={VB_H} fill="url(#bg)" />
        {/* halo d'ambiance équipe */}
        <Circle cx={VB_W / 2} cy={VB_H / 2} r={210} fill={t.color} opacity={0.1} />

        {d !== '' && (
          <>
            <AnimatedPath d={d} stroke={t.color} strokeOpacity={0.45} strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray={len} animatedProps={dashProps} />
            <AnimatedPath d={d} stroke="#6AA6FF" strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={len} animatedProps={dashProps} />
            <Circle cx={screen[0].x} cy={screen[0].y} r={5} fill="#0E1116" stroke="#6AA6FF" strokeWidth={2.5} />
            <AnimatedG animatedProps={cursorProps}>
              <Circle r={24} fill={t.color} opacity={0.25} />
              <Circle r={9} fill="#FFFFFF" />
              <Circle r={6} fill={t.color} />
            </AnimatedG>
          </>
        )}
      </Svg>

      {/* en-tête */}
      <View style={styles.header}>
        <Text style={styles.logo}>BORNES</Text>
        <Text style={styles.team}>{t.emoji} {t.name}</Text>
      </View>

      {/* bloc stats */}
      <View style={styles.bottom}>
        <Text style={styles.bigValue}>
          {shownKm} <Text style={styles.bigUnit}>km peints</Text>
        </Text>
        <Text style={styles.tagline}>{pseudo} a repeint un bout d’Asnières aux couleurs {t.name.toLowerCase()}.</Text>
        <View style={styles.row}>
          <Stat label="Distance" value={`${distanceKm} km`} />
          <Stat label="Durée" value={duration} />
          <Stat label="Allure" value={`${pace}/km`} />
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 9 / 16, width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#0E1116' },
  header: { position: 'absolute', top: 22, left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { color: '#6AA6FF', fontSize: 15, fontWeight: '800', letterSpacing: 5 },
  team: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  bottom: { position: 'absolute', left: 22, right: 22, bottom: 26 },
  bigValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  bigUnit: { fontSize: 18, color: '#9AA3B2', fontWeight: '800', letterSpacing: 0 },
  tagline: { color: '#C7CDD6', fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 22 },
  stat: {},
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#8A93A2', fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
});
