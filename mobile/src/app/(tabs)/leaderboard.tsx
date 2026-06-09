// Classement (maquette 06) — contrôle de la ville + quartiers + top peintres.

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CITY_CONTROL, NEIGHBORHOODS, TOP_RUNNERS } from '@/lib/mockData';
import { light, TEAMS } from '@/theme/tokens';

export default function Leaderboard() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Classement</Text>
      <Text style={styles.sub}>Asnières · Saison 1 · J-12</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contrôle de la ville</Text>
        <View style={styles.bar}>
          {CITY_CONTROL.map((c) => (
            <View key={c.team} style={{ flex: c.percent, backgroundColor: TEAMS[c.team].color }} />
          ))}
        </View>
        <View style={styles.legend}>
          {CITY_CONTROL.map((c) => (
            <View key={c.team} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: TEAMS[c.team].color }]} />
              <Text style={styles.legendText}>
                {TEAMS[c.team].name.replace('Les ', '')} {c.percent} %
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quartiers</Text>
        {NEIGHBORHOODS.map((n) => (
          <View key={n.name} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: TEAMS[n.leader].color }]} />
            <Text style={styles.rowName}>{n.name}</Text>
            <Text style={[styles.rowValue, { color: TEAMS[n.leader].color }]}>{n.percent} %</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top peintres du mois</Text>
        {TOP_RUNNERS.map((r, i) => (
          <View key={r.pseudo} style={styles.row}>
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={[styles.dot, { backgroundColor: TEAMS[r.team].color }]} />
            <Text style={styles.rowName}>{r.pseudo}</Text>
            <Text style={styles.rowValue}>{r.paintedKm.toFixed(1).replace('.', ',')} km</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 20, paddingTop: 76, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: light.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: light.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: light.surface, borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 7, overflow: 'hidden', marginBottom: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 3 },
  legendText: { fontSize: 11.5, fontWeight: '700', color: '#3A3F4C' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  rank: { width: 18, fontSize: 13, fontWeight: '800', color: light.textMuted },
  rowName: { flex: 1, fontSize: 15, fontWeight: '700', color: light.text },
  rowValue: { fontSize: 14, fontWeight: '800', color: light.text },
});
