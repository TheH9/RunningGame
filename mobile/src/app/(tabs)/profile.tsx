// Profil (maquette 10) — stats perso + « % découvert » (fog-of-war perso, ADR-003).

import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { discoveryPercent } from '@/lib/territory';
import { useAppStore } from '@/store/useAppStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { light, TEAMS } from '@/theme/tokens';

// ~nb de cellules H3 rés. 11 couvrant Asnières (estimation, affinée serveur)
const CITY_CELLS = 12000;

export default function Profile() {
  const { pseudo, team, totalRuns, totalDistanceM, totalPaintedM, discoveredCells, bestRun } = useAppStore();
  const hallOfFame = useSeasonStore((s) => s.hallOfFame);
  const t = team ? TEAMS[team] : null;
  const discovered = discoveryPercent(new Set(discoveredCells), CITY_CELLS);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={[styles.header, t && { backgroundColor: t.color }]}>
        <Text style={styles.avatar}>{t?.emoji ?? '🏃'}</Text>
        <Text style={styles.pseudo}>{pseudo ?? 'Coureur'}</Text>
        <Text style={styles.team}>{t ? `${t.name} · Asnières` : 'Sans équipe'}</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalRuns}</Text>
          <Text style={styles.statLabel}>Runs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{(totalDistanceM / 1000).toFixed(1).replace('.', ',')} km</Text>
          <Text style={styles.statLabel}>Courus</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, t && { color: t.color }]}>{(totalPaintedM / 1000).toFixed(1).replace('.', ',')} km</Text>
          <Text style={styles.statLabel}>Peints</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{discovered} %</Text>
          <Text style={styles.statLabel}>d’Asnières découvert</Text>
        </View>
      </View>

      {bestRun && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏅 Record</Text>
          <Text style={styles.cardText}>
            Meilleure allure : {Math.floor(bestRun.paceMinKm)}:{String(Math.round((bestRun.paceMinKm % 1) * 60)).padStart(2, '0')} /km
            sur {(bestRun.distanceM / 1000).toFixed(1).replace('.', ',')} km
          </Text>
        </View>
      )}

      {hallOfFame.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏛 Hall of Fame</Text>
          {hallOfFame.map((r) => (
            <Text key={r.season.number} style={[styles.cardText, { marginBottom: 6 }]}>
              Saison {r.season.number} — {TEAMS[r.podium[0]?.team ?? 'vagues'].emoji}{' '}
              {TEAMS[r.podium[0]?.team ?? 'vagues'].name} ({r.podium[0]?.percent ?? 0} %) · toi :{' '}
              {r.me.paintedKm.toFixed(1).replace('.', ',')} km, #{r.me.rank}
            </Text>
          ))}
        </View>
      )}

      <Pressable style={styles.settings} onPress={() => router.push('/settings')}>
        <Text style={styles.settingsText}>⚙️ Réglages · Privacy Zone · Reset démo</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 20, paddingTop: 76, paddingBottom: 40 },
  header: { backgroundColor: '#3B82F6', borderRadius: 26, padding: 26, alignItems: 'center', marginBottom: 16 },
  avatar: { fontSize: 44 },
  pseudo: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  team: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: light.surface, borderRadius: 20, padding: 16 },
  statValue: { fontSize: 22, fontWeight: '800', color: light.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 10.5, fontWeight: '700', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 },
  card: { backgroundColor: light.surface, borderRadius: 22, padding: 18, marginBottom: 14 },
  settings: { backgroundColor: 'rgba(31,41,55,0.06)', borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  settingsText: { fontSize: 13.5, fontWeight: '800', color: '#3A3F4C' },
  cardTitle: { fontSize: 11, fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  cardText: { fontSize: 13.5, lineHeight: 20, color: light.textMuted, fontWeight: '600' },
});
