// Détail de badge — modal : médaille, condition, état.

import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Pop, Squish } from '@/components/ui';
import { useGameStore } from '@/store/useGameStore';
import { c, ENERGY, font, glow } from '@/theme/tokens';

export default function BadgeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const badge = useGameStore((s) => s.getBadges)().find((b) => b.id === id);
  if (!badge) {
    router.back();
    return null;
  }

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.card}>
        <Pop>
          <View style={[styles.medal, badge.unlocked ? glow(ENERGY, 30, 0.7) : null, !badge.unlocked && styles.medalLock]}>
            <Text style={{ fontSize: 64 }}>{badge.unlocked ? badge.emoji : '🔒'}</Text>
          </View>
        </Pop>
        <Text style={styles.status}>{badge.unlocked ? 'BADGE DÉBLOQUÉ' : 'BADGE VERROUILLÉ'}</Text>
        <Text style={styles.label}>{badge.label}</Text>
        <Text style={styles.desc}>{badge.desc}</Text>
        <Squish style={styles.cta} onPress={() => router.back()}>
          <Text style={styles.ctaText}>{badge.unlocked ? 'Trop fort 💪' : 'À débloquer !'}</Text>
        </Squish>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(8,9,13,0.9)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  card: { backgroundColor: '#14161E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 28, padding: 28, alignItems: 'center', alignSelf: 'stretch' },
  medal: { width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(184,255,46,0.08)', borderWidth: 2, borderColor: ENERGY, alignItems: 'center', justifyContent: 'center' },
  medalLock: { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)' },
  status: { color: ENERGY, fontFamily: font.black, fontSize: 11, letterSpacing: 2, marginTop: 20 },
  label: { color: c.text, fontFamily: font.black, fontSize: 26, letterSpacing: -0.5, marginTop: 8 },
  desc: { color: c.textMuted, fontFamily: font.bold, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  cta: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 40, marginTop: 22 },
  ctaText: { color: c.text, fontFamily: font.extrabold, fontSize: 14.5 },
});
