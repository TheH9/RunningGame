// Run actif — sombre immersif (maquette 04 / style final validé) :
// curseur flèche + traînée comète, HUD chrono/distance/allure/peint.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapCanvas } from '@/components/MapCanvas';
import { formatDuration, formatKm, formatPace } from '@/lib/geo';
import { useAppStore } from '@/store/useAppStore';
import { useRunStore } from '@/store/useRunStore';
import { dark, TEAMS } from '@/theme/tokens';

export default function RunScreen() {
  const insets = useSafeAreaInsets();
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const recordRun = useAppStore((s) => s.recordRun);
  const { status, points, distanceM, elapsedMs, permissionDenied, start, pause, resume, stop } = useRunStore();

  useEffect(() => {
    if (status === 'idle' || status === 'finished') start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const summary = stop();
    recordRun(summary.distanceM, summary.paintedM, summary.cells);
    router.replace('/summary');
  };

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <MapCanvas dark team={team} trail={points} />
      </View>

      <View style={[styles.hud, { top: insets.top + 8 }]}>
        <Text style={styles.time}>{formatDuration(elapsedMs)}</Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.value}>
              {formatKm(distanceM)}
              <Text style={styles.unit}> km</Text>
            </Text>
            <Text style={styles.label}>Distance</Text>
          </View>
          <View style={[styles.cell, styles.cellMid]}>
            <Text style={styles.value}>
              {formatPace(distanceM, elapsedMs)}
              <Text style={styles.unit}> /km</Text>
            </Text>
            <Text style={styles.label}>Allure</Text>
          </View>
          <View style={styles.cell}>
            <Text style={[styles.value, { color: dark.accent }]}>
              +{formatKm(distanceM)}
              <Text style={styles.unit}> km</Text>
            </Text>
            <Text style={styles.label}>Peint</Text>
          </View>
        </View>
      </View>

      <View style={[styles.live, { top: insets.top + 148, backgroundColor: TEAMS[team].color }]}>
        <View style={styles.rec} />
        <Text style={styles.liveText}>
          {permissionDenied ? 'AUTORISE LA LOCALISATION POUR PEINDRE' : `EN COURS · tu peins pour ${TEAMS[team].name}`}
        </Text>
      </View>

      <View style={[styles.controls, { bottom: insets.bottom + 30 }]}>
        <Pressable
          style={styles.round}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            status === 'paused' ? resume() : pause();
          }}>
          <Text style={styles.roundText}>{status === 'paused' ? '▶' : '❚❚'}</Text>
        </Pressable>
        <Pressable style={styles.stop} onPress={onStop}>
          <Text style={styles.stopText}>STOP</Text>
        </Pressable>
        <View style={[styles.round, { opacity: 0.5 }]}>
          <Text style={styles.roundText}>🔒</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: dark.surface,
    borderRadius: 24,
    padding: 16,
  },
  time: { color: '#FFFFFF', fontSize: 44, fontWeight: '800', letterSpacing: -2, textAlign: 'center', lineHeight: 48 },
  grid: { flexDirection: 'row', marginTop: 13, borderTopWidth: 1, borderTopColor: dark.border, paddingTop: 12 },
  cell: { flex: 1, alignItems: 'center' },
  cellMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: dark.border },
  value: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  unit: { fontSize: 12, color: dark.textMuted },
  label: { fontSize: 10, fontWeight: '700', color: dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  live: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 26 },
  round: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 18, color: '#1C1E24', fontWeight: '800' },
  stop: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FF4D5E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4D5E',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  stopText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
