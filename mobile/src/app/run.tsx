// Run actif — typo XXL, stats glass, toasts néon, curseur glow.

import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBackend } from '@/backend/GameBackend';
import { MapView } from '@/components/map/MapView';
import { NeonButton } from '@/components/NeonButton';
import { LiveToastStack } from '@/components/run/LiveToastStack';
import { ZoneCounter } from '@/components/run/ZoneCounter';
import { Glass, Micro, Squish } from '@/components/ui';
import { formatDuration, formatKm, formatPace } from '@/lib/geo';
import { startRunDirector } from '@/lib/runDirector';
import { useAppStore } from '@/store/useAppStore';
import { useGameStore } from '@/store/useGameStore';
import { useRunEventsStore } from '@/store/useRunEventsStore';
import { useRunStore } from '@/store/useRunStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { useTerritoryStore } from '@/store/useTerritoryStore';
import { c, font, TEAMS, VIOLET } from '@/theme/tokens';

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

  const trail = useMemo(
    () => useRunStore.getState().segments.flat(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(pointCount / 5)],
  );

  useEffect(() => {
    if (useRunStore.getState().status === 'idle' && !useRunStore.getState().permissionDenied) {
      useRunStore.getState().start();
    }
    const stop = startRunDirector(team);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStop = () => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const summary = useRunStore.getState().stop();
    if (!summary.tooShort && !summary.invalidated) {
      recordRun(summary.distanceM, summary.paintedM, summary.cells, summary.elapsedMs);
      // couche de jeu : XP, niveau, streak, badges
      useGameStore.getState().awardRun({
        distanceM: summary.distanceM,
        paintedM: summary.paintedM,
        captures: useRunEventsStore.getState().zonesCaptured,
        totalPaintedM: useAppStore.getState().totalPaintedM,
        hour: new Date().getHours(),
      });
      const pseudo = useAppStore.getState().pseudo ?? 'Moi';
      useTerritoryStore.getState().applyMyRun(team, pseudo, summary.cells, {
        id: `me-${Date.now()}`, team, runnerPseudo: pseudo, points: summary.points, paintedAt: Date.now(),
      });
      getBackend()
        .submitRun({
          segments: summary.segments, distanceM: summary.distanceM, paintedM: summary.paintedM,
          elapsedMs: summary.elapsedMs, startedAt: summary.startedAt,
          seasonNumber: useSeasonStore.getState().current?.number ?? 1,
        })
        .then(() => useSeasonStore.getState().checkRollover())
        .catch(() => {});
    }
    router.replace('/summary');
  };

  if (permissionDenied) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>📍</Text>
        <Text style={styles.permTitle}>Bornes a besoin de ta position</Text>
        <Text style={styles.permText}>
          Sans GPS, impossible de peindre ta trace. Autorise la localisation, ou essaie le mode démo.
        </Text>
        <Squish style={styles.permCta} onPress={() => Linking.openSettings()}>
          <Text style={styles.permCtaText}>Ouvrir les réglages</Text>
        </Squish>
        <Squish style={styles.permAlt} onPress={() => useRunStore.getState().start({ replay: true })}>
          <Text style={styles.permAltText}>▶ Essayer en mode démo</Text>
        </Squish>
        <Squish style={{ paddingVertical: 10 }} onPress={() => router.back()}>
          <Text style={{ color: c.textMuted, fontFamily: font.bold, fontSize: 13.5 }}>Retour</Text>
        </Squish>
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
  const statusColor = autoPaused || tooFastNow ? c.gold : status === 'paused' ? c.textMuted : TEAMS[team].color;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <MapView dark team={team} trail={trail} follow interactive={false} initialScale={1.4} />
      </View>
      <View style={styles.vignette} pointerEvents="none" />

      <Glass style={[styles.rtop, { top: insets.top + 6 }]}>
        <Micro style={{ textAlign: 'center', letterSpacing: 4, marginBottom: 4 }}>TEMPS</Micro>
        <Text style={styles.time}>{formatDuration(elapsedMs)}</Text>
        <View style={styles.grid}>
          <Cell value={formatKm(distanceM)} unit=" km" label="Distance" />
          <Cell value={formatPace(distanceM, elapsedMs)} unit="/km" label="Allure" />
          <Cell value={`+${formatKm(Math.max(0, distanceM - flaggedM))}`} unit=" km" label="Peint" hot />
        </View>
      </Glass>

      <View style={[styles.statusPill, { top: insets.top + 158, backgroundColor: statusColor }]}>
        <View style={styles.rec} />
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 196 }} pointerEvents="none">
        <LiveToastStack />
      </View>
      <View style={{ position: 'absolute', right: 0, top: insets.top + 196 }} pointerEvents="none">
        <ZoneCounter />
      </View>

      <View style={[styles.controls, { bottom: insets.bottom + 36 }]}>
        <Squish
          style={[styles.round, locked && styles.disabled]}
          onPress={() => {
            if (locked) return;
            Haptics.selectionAsync().catch(() => {});
            status === 'paused' ? useRunStore.getState().resume() : useRunStore.getState().pause();
          }}>
          <Text style={styles.roundText}>{status === 'paused' ? '▶' : '❚❚'}</Text>
        </Squish>
        <NeonButton
          label="STOP"
          size={92}
          rings={false}
          colors={['#FF6B78', '#E7263A', '#C81e32']}
          glowColor={c.red}
          onPress={onStop}
          haptic={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})}
        />
        <Squish
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
        </Squish>
      </View>
      {locked && <Text style={[styles.lockHint, { bottom: insets.bottom + 10 }]}>Appui long sur 🔓 pour déverrouiller</Text>}
    </View>
  );
}

function Cell({ value, unit, label, hot }: { value: string; unit: string; label: string; hot?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellValue, hot && { color: VIOLET }]}>
        {value}
        <Text style={styles.cellUnit}>{unit}</Text>
      </Text>
      <Micro style={{ marginTop: 3 }}>{label}</Micro>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  vignette: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  rtop: { position: 'absolute', left: 14, right: 14, padding: 18, paddingTop: 18 },
  time: { fontFamily: font.black, color: c.text, fontSize: 56, letterSpacing: -2, textAlign: 'center', lineHeight: 58 },
  grid: { flexDirection: 'row', gap: 9, marginTop: 14 },
  cell: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 11, alignItems: 'center' },
  cellValue: { fontFamily: font.black, color: c.text, fontSize: 22, letterSpacing: -0.5 },
  cellUnit: { fontFamily: font.bold, color: c.textMuted, fontSize: 11 },
  statusPill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  statusText: { color: '#0A0B0F', fontSize: 11, fontFamily: font.extrabold },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18 },
  round: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 19, color: '#FFFFFF', fontFamily: font.extrabold },
  lockedBtn: { backgroundColor: c.gold },
  disabled: { opacity: 0.35 },
  lockHint: { position: 'absolute', alignSelf: 'center', color: c.textMuted, fontSize: 11, fontFamily: font.bold },
  permTitle: { color: c.text, fontFamily: font.black, fontSize: 24, textAlign: 'center', letterSpacing: -0.5 },
  permText: { color: c.textMuted, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 28, fontFamily: font.bold },
  permCta: { backgroundColor: VIOLET, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 36, marginBottom: 12 },
  permCtaText: { color: '#FFFFFF', fontSize: 15, fontFamily: font.extrabold },
  permAlt: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 30, marginBottom: 12 },
  permAltText: { color: '#FFFFFF', fontSize: 14, fontFamily: font.bold },
});
