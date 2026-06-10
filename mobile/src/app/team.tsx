// Choix d'équipe — cartes néon, définitif pour la saison.

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Squish } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useAppStore } from '@/store/useAppStore';
import { c, font, glow, TEAMS, type TeamSlug } from '@/theme/tokens';

export default function TeamSelect() {
  const [selected, setSelected] = useState<TeamSlug | null>(null);
  const chooseTeam = useAppStore((s) => s.chooseTeam);

  const onConfirm = () => {
    if (!selected) return;
    confirm(
      `Rejoindre ${TEAMS[selected].name} ?`,
      'Ton choix est définitif pour toute la saison.',
      'Je m’engage',
      () => {
        chooseTeam(selected);
        router.replace('/(tabs)');
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>CHOISIS{'\n'}TON CAMP</Text>
        <Text style={styles.sub}>À Asnières · ton choix est définitif pour la saison</Text>
        {(Object.keys(TEAMS) as TeamSlug[]).map((slug, i) => {
          const team = TEAMS[slug];
          const sel = selected === slug;
          return (
            <Animated.View key={slug} entering={FadeInDown.delay(100 + i * 80).springify().damping(15)}>
              <Squish
                onPress={() => setSelected(slug)}
                style={[
                  styles.card,
                  { borderColor: sel ? team.color : 'rgba(255,255,255,0.08)' },
                  sel ? glow(team.glow, 26, 0.5) : null,
                  sel ? { backgroundColor: 'rgba(255,255,255,0.04)' } : null,
                ]}>
                <View style={[styles.emojiBox, { backgroundColor: sel ? team.color : 'rgba(255,255,255,0.05)' }]}>
                  <Text style={styles.emoji}>{team.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, sel && { color: team.color }]}>{team.name}</Text>
                  <Text style={styles.desc}>{sel ? 'Tu fais déjà partie de la vague' : 'Appuie pour rejoindre'}</Text>
                </View>
                <View style={[styles.dot, { backgroundColor: team.color }, sel ? glow(team.color, 10, 1) : null]} />
              </Squish>
            </Animated.View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Squish style={[styles.cta, !selected && { opacity: 0.4 }]} disabled={!selected} onPress={onConfirm}>
          <Text style={styles.ctaText}>{selected ? `Rejoindre ${TEAMS[selected].name}` : 'Sélectionne une équipe'}</Text>
        </Squish>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 24, paddingTop: 88, paddingBottom: 140 },
  title: { fontFamily: font.black, fontSize: 38, color: c.text, letterSpacing: -1.5, lineHeight: 40 },
  sub: { fontSize: 14, color: c.textMuted, fontFamily: font.bold, marginTop: 8, marginBottom: 26 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  emojiBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  name: { fontSize: 18, fontFamily: font.extrabold, color: c.text },
  desc: { fontSize: 12.5, fontFamily: font.bold, color: c.textMuted, marginTop: 2 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, paddingBottom: 40, backgroundColor: c.bg },
  cta: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 17, alignItems: 'center' },
  ctaText: { color: '#0A0B0F', fontSize: 16, fontFamily: font.extrabold },
});
