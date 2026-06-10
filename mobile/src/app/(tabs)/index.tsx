// Carte — l'écran principal, langage « jeu » : command HUD (niveau/XP/streak),
// ruban de saison, standings néon, bouton GO néon, cloche d'activité.

import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBackend } from '@/backend/GameBackend';
import type { TeamScore } from '@/backend/types';
import { MapView, type InspectInfo } from '@/components/map/MapView';
import { StreetCard } from '@/components/map/StreetCard';
import { NeonButton } from '@/components/NeonButton';
import { Glass, LevelRing, Bar, Streak, Micro } from '@/components/ui';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { confirm } from '@/lib/confirm';
import { levelFromXp, useGameStore } from '@/store/useGameStore';
import { useAppStore } from '@/store/useAppStore';
import { clearRunSnapshot, readRunSnapshot, useRunStore } from '@/store/useRunStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { useSocialStore } from '@/store/useSocialStore';
import { c, font, TEAMS, VIOLET } from '@/theme/tokens';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const pseudo = useAppStore((s) => s.pseudo) ?? 'Coureur';
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const xp = useGameStore((s) => s.xp);
  const streak = useGameStore((s) => s.streak);
  const lvl = levelFromXp(xp);
  const [control, setControl] = useState<TeamScore[]>([]);
  const [inspect, setInspect] = useState<InspectInfo | null>(null);
  const unread = useSocialStore((s) => s.unread);
  const season = useSeasonStore((s) => s.current);
  const daysLeft = useSeasonStore((s) => s.daysLeft)();
  const t = TEAMS[team];

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getBackend().getLeaderboards().then((d) => alive && setControl(d.teams)).catch(() => {});
      useSocialStore.getState().hydrate().catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  useEffect(() => {
    (async () => {
      const snap = await readRunSnapshot();
      if (!snap || snap.distanceM < 100) {
        if (snap) clearRunSnapshot();
        return;
      }
      confirm(
        'Course interrompue 🏃',
        `Une course de ${(snap.distanceM / 1000).toFixed(1).replace('.', ',')} km n'a pas été terminée. Sauvegarder la distance ?`,
        'Sauvegarder',
        () => {
          useAppStore.getState().recordRun(snap.distanceM, snap.distanceM, [], 0);
          clearRunSnapshot();
        },
      );
      setTimeout(() => clearRunSnapshot(), 60000);
    })();
  }, []);

  const startRun = (replay: boolean) => {
    if (useRunStore.getState().status === 'running') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (replay) useRunStore.getState().start({ replay: true });
    router.push('/run');
  };

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <MapView dark team={team} onInspect={setInspect} />
      </View>
      <View style={styles.vignette} pointerEvents="none" />

      {/* Command HUD : niveau · XP · streak */}
      <Glass style={[styles.topbar, { top: insets.top + 6 }]}>
        <LevelRing level={lvl.level} progress={lvl.progress} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{pseudo}</Text>
          <View style={{ marginTop: 6 }}>
            <Bar progress={lvl.progress} color={VIOLET} height={7} />
          </View>
          <Micro style={{ marginTop: 4 }}>
            {lvl.into} / {lvl.span} XP · niv. {lvl.level + 1}
          </Micro>
        </View>
        <Streak days={streak} />
      </Glass>

      {/* Ruban de saison */}
      <Glass style={[styles.ribbon, { top: insets.top + 84 }]}>
        <Text style={styles.ribbonText}>
          SAISON <Text style={{ color: c.cyan }}>{season?.number ?? 1}</Text> · Asnières
        </Text>
        <Text style={[styles.ribbonDays, daysLeft <= 3 && { color: c.red }]}>⏳ J-{daysLeft}</Text>
      </Glass>

      {/* Standings néon */}
      <Glass style={[styles.stand, { top: insets.top + 140 }]}>
        {control.map((s) => (
          <View key={s.team} style={styles.standRow}>
            <View style={[styles.standDot, { backgroundColor: TEAMS[s.team].color, shadowColor: TEAMS[s.team].color }]} />
            <Text style={styles.standPct}>{s.percent}%</Text>
            <View style={styles.standTrack}>
              <View style={{ width: `${s.percent}%`, height: '100%', borderRadius: 3, backgroundColor: TEAMS[s.team].color }} />
            </View>
          </View>
        ))}
      </Glass>

      {/* Cloche */}
      <Pressable style={[styles.bell, { top: insets.top + 140 }]} onPress={() => router.push('/feed')}>
        <Glass style={styles.bellInner}>
          <Text style={{ fontSize: 17 }}>🔔</Text>
        </Glass>
        {unread > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      {inspect && (
        <StreetCard
          info={inspect}
          onClose={() => setInspect(null)}
          onChallenge={() => {
            setInspect(null);
            startRun(false);
          }}
        />
      )}

      <TutorialOverlay />

      {/* GO néon */}
      <View style={[styles.goWrap, { bottom: insets.bottom + 92 }]}>
        <NeonButton
          label="GO"
          sub="START"
          colors={['#D4FF6B', '#B8FF2E', '#8FD400']}
          glowColor={VIOLET}
          textColor="#0A0B0F"
          onPress={() => startRun(false)}
          onLongPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            startRun(true);
          }}
          delayLongPress={1500}
        />
        <Text style={styles.goHint}>appui long = démo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  vignette: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  topbar: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  name: { color: c.text, fontFamily: font.extrabold, fontSize: 16, letterSpacing: -0.2 },
  ribbon: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 15 },
  ribbonText: { color: c.text, fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.4 },
  ribbonDays: { color: c.gold, fontFamily: font.extrabold, fontSize: 10, letterSpacing: 0.4 },
  stand: { position: 'absolute', left: 14, padding: 11, gap: 8, width: 150 },
  standRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  standDot: { width: 9, height: 9, borderRadius: 3, shadowRadius: 6, shadowOpacity: 0.9 },
  standPct: { color: c.text, fontFamily: font.extrabold, fontSize: 11, width: 30 },
  standTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  bell: { position: 'absolute', right: 14, width: 44, height: 44 },
  bellInner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  bellBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: c.red, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: font.extrabold },
  goWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  goHint: { color: c.textMuted, fontSize: 10, fontFamily: font.bold, marginTop: 2 },
});
