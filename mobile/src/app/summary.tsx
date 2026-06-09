// Fin de run (maquette 05) — le moment fierté : surface peinte + partage.
// L'animation 9:16 partageable arrive au lot « Moment viral » (semaines 5-6).

import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapCanvas } from '@/components/MapCanvas';
import { formatDuration, formatKm, formatPace } from '@/lib/geo';
import { useAppStore } from '@/store/useAppStore';
import { useRunStore } from '@/store/useRunStore';
import { dark, TEAMS } from '@/theme/tokens';

export default function Summary() {
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const summary = useRunStore((s) => s.lastSummary);
  const t = TEAMS[team];

  if (!summary) {
    router.replace('/(tabs)');
    return null;
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.mapCard}>
          <MapCanvas dark team={team} trail={summary.points} />
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText}>+{formatKm(summary.paintedM)} km peints pour {t.name} {t.emoji}</Text>
          </View>
        </View>

        <Text style={styles.title}>Belle trace. 🔥</Text>
        <Text style={styles.sub}>Ta trace rejoint le territoire {t.name.toLowerCase()} — elle compte dès maintenant.</Text>

        <View style={styles.grid}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatKm(summary.distanceM)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(summary.elapsedMs)}</Text>
            <Text style={styles.statLabel}>Durée</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatPace(summary.distanceM, summary.elapsedMs)} /km</Text>
            <Text style={styles.statLabel}>Allure</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: t.color }]}>{summary.cells.length}</Text>
            <Text style={styles.statLabel}>Zones touchées</Text>
          </View>
        </View>

        <Pressable style={[styles.share, { backgroundColor: t.color }]}>
          <Text style={styles.shareText}>Partager ma trace (bientôt)</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backText}>Retour à la carte</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  scroll: { padding: 24, paddingTop: 70, paddingBottom: 50 },
  mapCard: { height: 360, borderRadius: 26, overflow: 'hidden', marginBottom: 24 },
  mapBadge: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(22,26,33,0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mapBadgeText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  sub: { color: dark.textMuted, fontSize: 14.5, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
  },
  statValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: dark.textMuted, fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 },
  share: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  shareText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },
  back: { borderRadius: 18, paddingVertical: 15, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  backText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
});
