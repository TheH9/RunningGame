// Récompenses (maquettes 07-09) — défi sponsorisé du mois + coffre à lots.

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHALLENGE } from '@/lib/mockData';
import { useAppStore } from '@/store/useAppStore';
import { light } from '@/theme/tokens';

export default function Rewards() {
  const paintedKm = useAppStore((s) => s.totalPaintedM) / 1000;
  const progress = Math.min(1, paintedKm / CHALLENGE.goalKm);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Récompenses</Text>
      <Text style={styles.sub}>De vrais lots, dans tes rues</Text>

      <View style={styles.hero}>
        <Text style={styles.heroTag}>DÉFI DU MOIS · SPONSORISÉ</Text>
        <Text style={styles.heroTitle}>{CHALLENGE.title}</Text>
        <Text style={styles.heroDesc}>{CHALLENGE.description}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {paintedKm.toFixed(1).replace('.', ',')} / {CHALLENGE.goalKm} km peints · fin le {CHALLENGE.endsAt}
        </Text>
        <View style={styles.prizeBox}>
          <Text style={styles.prizeEmoji}>👟</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prizeText}>{CHALLENGE.prize}</Text>
            <Text style={styles.prizePartner}>{CHALLENGE.partner}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mon coffre</Text>
        <Text style={styles.empty}>
          Pas encore de lot — termine le défi du mois ou attrape un Drop pour remplir ton coffre. Chaque lot gagné
          devient un QR code à montrer en boutique.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 20, paddingTop: 76, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: light.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: light.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 20 },
  hero: { backgroundColor: '#1C1E24', borderRadius: 24, padding: 20, marginBottom: 16 },
  heroTag: { color: '#F5B82E', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  progressTrack: { height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#3B82F6' },
  progressText: { color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: '700', marginTop: 8, marginBottom: 16 },
  prizeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
  },
  prizeEmoji: { fontSize: 26 },
  prizeText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  prizePartner: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: light.surface, borderRadius: 22, padding: 18 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  empty: { fontSize: 13.5, lineHeight: 20, color: light.textMuted, fontWeight: '600' },
});
