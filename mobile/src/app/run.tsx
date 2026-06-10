// Run actif — sombre immersif : curseur flèche + traînée comète, HUD complet.
// États gérés : permission refusée (écran dédié), auto-pause GPS, peinture
// suspendue (vitesse), verrouillage. Les toasts live arrivent avec RunDirector.

import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapCanvas } from '@/components/MapCanvas';
import { formatDuration, formatKm, formatPace } from '@/lib/geo';
import { useAppStore } from '@/store/useAppStore';
import { useRunStore } from '@/store/useRunStore';
import { dark, TEAMS } from '@/theme/tokens';

export default function RunScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const recordRun = useAppStore((s) => s.recordRun);
  const status = useRunStore((s) => s.status);
  const distanceM = useRunStore((s) => s.distanceM);
  const flaggedM = useRunStore((s) => s.flaggedM);
  const elapsedMs = useRunStore((s) => s.elapsedMs);
  const pointCount = useRunStore((s) => s.pointCount);
  const autoPaused = useRunStore((s) => s.autoPaused);
  const tooFastNow = useRunStore((s) => s.tooFastNow);
  const permissionDenied = useRunStore((s) => s.permissionDenied);
  const [locked, setLocked] = useState(false);

  // trace à plat pour le rendu (reconstruite tous les 5 points — budget perf)
  const trail = useMemo(
    () => useRunStore.getState().segments.flat(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(pointCount / 5)],
  );

  useEffect(() => {
    if (useRunStore.getState().status === 'idle' && !useRunStore.getState().permissionDenied) {
      useRunStore.getState().start();
    }
  }, []);

  const onStop = () => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const summary = useRunStore.getState().stop();
    if (!summary.tooShort) {
      recordRun(summary.distanceM, summary.paintedM, summary.cells, summary.elapsedMs);
    }
    router.replace('/summary');
  };

  if (permissionDenied) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.permEmoji}>📍</Text>
        <Text style={styles.permTitle}>Bornes a besoin de ta position</Text>
        <Text style={styles.permText}>
          Sans GPS, impossible de peindre ta trace. Autorise la localisation dans les réglages, ou essaie le mode
          démo pour voir le jeu en action.
        </Text>
        <Pressable style={styles.permCta} onPress={() => Linking.openSettings()}>
          <Text style={styles.permCtaText}>Ouvrir les réglages</Text>
        </Pressable>
        <Pressable
          style={styles.permAlt}
          onPress={() => useRunStore.getState().start({ replay: true })}>
          <Text style={styles.permAltText}>▶ Essayer en mode démo</Text>
        </Pressable>
        <Pressable style={styles.permBack} onPress={() => router.back()}>
          <Text style={styles.permBackText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const statusLabel = autoPaused
    ? 'SIGNAL GPS PERDU · pause auto'
    : tooFastNow
      ? 'PEINTURE SUSPENDUE 🚗 trop rapide'
      : status === 'paused'
        ? 'EN PAUSE'
        : `EN COURS · tu peins pour ${TEAMS[team].name}`;
  const statusColor = autoPaused || tooFastNow ? '#F5B82E' : status === 'paused' ? '#8A93A2' : TEAMS[team].color;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <MapCanvas dark team={team} trail={trail} />
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
              +{formatKm(Math.max(0, distanceM - flaggedM))}
              <Text style={styles.unit}> km</Text>
            </Text>
            <Text style={styles.label}>Peint</Text>
          </View>
        </View>
      </View>

      <View style={[styles.live, { top: insets.top + 148, backgroundColor: statusColor }]}>
        <View style={styles.rec} />
        <Text style={styles.liveText}>{statusLabel}</Text>
      </View>

      <View style={[styles.controls, { bottom: insets.bottom + 30 }]}>
        <Pressable
          style={[styles.round, locked && styles.disabled]}
          onPress={() => {
            if (locked) return;
            Haptics.selectionAsync().catch(() => {});
            status === 'paused' ? useRunStore.getState().resume() : useRunStore.getState().pause();
          }}>
          <Text style={styles.roundText}>{status === 'paused' ? '▶' : '❚❚'}</Text>
        </Pressable>
        <Pressable style={[styles.stop, locked && styles.disabled]} onPress={onStop}>
          <Text style={styles.stopText}>STOP</Text>
        </Pressable>
        <Pressable
          style={[styles.round, locked && styles.lockedBtn]}
          onPress={() => {
            if (!locked) {
              Haptics.selectionAsync().catch(() => {});
              setLocked(true);
            }
          }}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setLocked(false);
          }}
          delayLongPress={800}>
          <Text style={styles.roundText}>{locked ? '🔓' : '🔒'}</Text>
        </Pressable>
      </View>
      {locked && (
        <Text style={[styles.lockHint, { bottom: insets.bottom + 6 }]}>Appui long sur 🔓 pour déverrouiller</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  hud: { position: 'absolute', left: 16, right: 16, backgroundColor: dark.surface, borderRadius: 24, padding: 16 },
  time: { color: '#FFFFFF', fontSize: 44, fontWeight: '800', letterSpacing: -2, textAlign: 'center', lineHeight: 48 },
  grid: { flexDirection: 'row', marginTop: 13, borderTopWidth: 1, borderTopColor: dark.border, paddingTop: 12 },
  cell: { flex: 1, alignItems: 'center' },
  cellMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: dark.border },
  value: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  unit: { fontSize: 12, color: dark.textMuted },
  label: { fontSize: 10, fontWeight: '700', color: dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  live: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 26 },
  round: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 18, color: '#1C1E24', fontWeight: '800' },
  lockedBtn: { backgroundColor: '#F5B82E' },
  disabled: { opacity: 0.35 },
  stop: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FF4D5E', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF4D5E', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  stopText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  lockHint: { position: 'absolute', alignSelf: 'center', color: '#8A93A2', fontSize: 11, fontWeight: '700' },
  permEmoji: { fontSize: 56, marginBottom: 16 },
  permTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  permText: { color: dark.textMuted, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 28 },
  permCta: { backgroundColor: '#3B82F6', borderRadius: 18, paddingVertical: 15, paddingHorizontal: 36, marginBottom: 12 },
  permCtaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  permAlt: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 30, marginBottom: 12 },
  permAltText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  permBack: { paddingVertical: 10 },
  permBackText: { color: dark.textMuted, fontSize: 13.5, fontWeight: '700' },
});
