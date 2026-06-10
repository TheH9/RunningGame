// Map — l'écran principal (maquette 03) : territoire en veines + bouton GO.

import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBackend } from '@/backend/GameBackend';
import type { TeamScore } from '@/backend/types';
import { MapView, type InspectInfo } from '@/components/map/MapView';
import { StreetCard } from '@/components/map/StreetCard';
import { SeasonChip } from '@/components/SeasonChip';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { confirm } from '@/lib/confirm';
import { clearRunSnapshot, readRunSnapshot } from '@/store/useRunStore';
import { useAppStore } from '@/store/useAppStore';
import { useRunStore } from '@/store/useRunStore';
import { useSocialStore } from '@/store/useSocialStore';
import { light, TEAMS } from '@/theme/tokens';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const [control, setControl] = useState<TeamScore[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getBackend()
        .getLeaderboards()
        .then((d) => alive && setControl(d.teams))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const myShare = control.find((c) => c.team === team)?.percent ?? 0;
  const [inspect, setInspect] = useState<InspectInfo | null>(null);
  const unread = useSocialStore((s) => s.unread);

  useFocusEffect(
    useCallback(() => {
      useSocialStore.getState().hydrate().catch(() => {});
    }, []),
  );

  // récupération d'un run interrompu (app tuée pendant la course)
  useEffect(() => {
    (async () => {
      const snap = await readRunSnapshot();
      if (!snap || snap.distanceM < 100) {
        if (snap) clearRunSnapshot();
        return;
      }
      confirm(
        'Course interrompue 🏃',
        `Une course de ${(snap.distanceM / 1000).toFixed(1).replace('.', ',')} km n'a pas été terminée. Sauvegarder la distance dans tes stats ?`,
        'Sauvegarder',
        () => {
          const cells: string[] = [];
          useAppStore.getState().recordRun(snap.distanceM, snap.distanceM, cells, 0);
          clearRunSnapshot();
        },
      );
      // dans tous les cas on nettoie au prochain démarrage
      setTimeout(() => clearRunSnapshot(), 60000);
    })();
  }, []);

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <MapView team={team} onInspect={setInspect} />
      </View>

      <View style={[styles.hud, { top: insets.top + 8 }]}>
        <View>
          <Text style={styles.city}>Asnières</Text>
          <SeasonChip />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.share, { color: TEAMS[team].color }]}>{myShare} %</Text>
          <Text style={styles.hudSub}>{TEAMS[team].name}</Text>
        </View>
      </View>

      <View style={[styles.legend, { top: insets.top + 86 }]}>
        {control.map((c) => (
          <View key={c.team} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: TEAMS[c.team].color }]} />
            <Text style={styles.legendText}>
              {TEAMS[c.team].name.replace('Les ', '')} {c.percent} %
            </Text>
          </View>
        ))}
      </View>

      <Pressable style={[styles.bell, { top: insets.top + 86 }]} onPress={() => router.push('/feed')}>
        <Text style={{ fontSize: 17 }}>🔔</Text>
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
            router.push('/run');
          }}
        />
      )}

      <TutorialOverlay />

      <View style={styles.goWrap}>
        <Pressable
          style={[styles.go, { backgroundColor: TEAMS[team].color }]}
          onPress={() => {
            if (useRunStore.getState().status === 'running') return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
            router.push('/run');
          }}
          onLongPress={() => {
            // mode démo caché : appui long → run simulé (replay)
            if (useRunStore.getState().status === 'running') return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            useRunStore.getState().start({ replay: true });
            router.push('/run');
          }}
          delayLongPress={1500}>
          <Text style={styles.goText}>GO</Text>
          <Text style={styles.goSub}>START</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1F2937',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  city: { fontSize: 19, fontWeight: '800', color: light.text, letterSpacing: -0.3 },
  hudSub: { fontSize: 10, fontWeight: '700', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  share: { fontSize: 19, fontWeight: '800' },
  legend: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bell: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F2937',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4D5E',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendText: { fontSize: 11.5, fontWeight: '700', color: '#3A3F4C' },
  goWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  go: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  goText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  goSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: -2 },
});
