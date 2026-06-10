// Récap de fin de saison — podium animé, champion, mes contributions.

import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Confetti } from '@/components/ui/Confetti';
import { useSeasonStore } from '@/store/useSeasonStore';
import { c, font, TEAMS } from '@/theme/tokens';

export default function SeasonRecap() {
  const recap = useSeasonStore((s) => s.pendingRecap);
  const acknowledge = useSeasonStore((s) => s.acknowledgeRecap);

  useEffect(() => {
    if (!recap) router.replace('/(tabs)');
  }, [recap]);

  if (!recap) return null;

  const winner = recap.podium[0];
  const maxCells = Math.max(1, ...recap.podium.map((p) => p.cells));

  return (
    <View style={styles.root}>
      <Confetti run count={32} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInUp.delay(100)}>
          <Text style={styles.kicker}>SAISON {recap.season.number} TERMINÉE</Text>
          <Text style={styles.title}>
            {winner ? `${TEAMS[winner.team].emoji} ${TEAMS[winner.team].name}` : '—'}
            {'\n'}remportent la ville !
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
          <Text style={styles.cardTitle}>Podium des équipes</Text>
          {recap.podium.map((p, i) => (
            <View key={p.team} style={styles.podiumRow}>
              <Text style={styles.podiumRank}>{['🥇', '🥈', '🥉', '4ᵉ'][i]}</Text>
              <Text style={styles.podiumName}>{TEAMS[p.team].name}</Text>
              <View style={styles.podiumTrack}>
                <View
                  style={[styles.podiumFill, { width: `${Math.max(6, (p.cells / maxCells) * 100)}%`, backgroundColor: TEAMS[p.team].color }]}
                />
              </View>
              <Text style={styles.podiumPct}>{p.percent} %</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)} style={styles.card}>
          <Text style={styles.cardTitle}>Champion de la saison</Text>
          <Text style={styles.champion}>
            👑 {recap.champion.pseudo} · <Text style={{ color: TEAMS[recap.champion.team].color }}>{TEAMS[recap.champion.team].name}</Text>
          </Text>
          <Text style={styles.championSub}>{recap.champion.paintedKm.toFixed(1).replace('.', ',')} km peints</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(650)} style={styles.card}>
          <Text style={styles.cardTitle}>Ta saison</Text>
          <View style={styles.meRow}>
            <View style={styles.meStat}>
              <Text style={styles.meValue}>{recap.me.paintedKm.toFixed(1).replace('.', ',')} km</Text>
              <Text style={styles.meLabel}>peints</Text>
            </View>
            <View style={styles.meStat}>
              <Text style={styles.meValue}>#{recap.me.rank}</Text>
              <Text style={styles.meLabel}>au classement</Text>
            </View>
            <View style={styles.meStat}>
              <Text style={styles.meValue}>{recap.me.runs}</Text>
              <Text style={styles.meLabel}>runs</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(800)}>
          <Text style={styles.fresh}>🗺 La carte est remise à zéro — la Saison {recap.season.number + 1} commence. Tout est à prendre.</Text>
          <Pressable
            style={styles.cta}
            onPress={() => {
              acknowledge();
              router.replace('/(tabs)');
            }}>
            <Text style={styles.ctaText}>Conquérir la Saison {recap.season.number + 1} →</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 24, paddingTop: 84, paddingBottom: 50 },
  kicker: { color: c.violet2, fontSize: 12, fontFamily: font.black, letterSpacing: 3, marginBottom: 10 },
  title: { color: '#FFFFFF', fontSize: 34, fontFamily: font.black, letterSpacing: -1, lineHeight: 40, marginBottom: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 11, fontFamily: font.extrabold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  podiumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  podiumRank: { fontSize: 16, width: 28 },
  podiumName: { color: '#FFFFFF', fontSize: 13, fontFamily: font.bold, width: 92 },
  podiumTrack: { flex: 1, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  podiumFill: { height: '100%', borderRadius: 6 },
  podiumPct: { color: c.textMuted, fontSize: 12, fontFamily: font.extrabold, width: 42, textAlign: 'right' },
  champion: { color: '#FFFFFF', fontSize: 19, fontFamily: font.extrabold },
  championSub: { color: c.textMuted, fontSize: 13, fontFamily: font.bold, marginTop: 4 },
  meRow: { flexDirection: 'row' },
  meStat: { flex: 1, alignItems: 'center' },
  meValue: { color: '#FFFFFF', fontSize: 20, fontFamily: font.black, letterSpacing: -0.5 },
  meLabel: { color: c.textMuted, fontSize: 10.5, fontFamily: font.extrabold, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 },
  fresh: { color: '#C7CDD6', fontSize: 14, lineHeight: 21, textAlign: 'center', marginVertical: 18 },
  cta: { backgroundColor: c.violet, borderRadius: 18, paddingVertical: 17, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: font.extrabold },
});
