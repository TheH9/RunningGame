// Choix d'équipe — définitif pour la saison (maquette 02).

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { confirm } from '@/lib/confirm';
import { useAppStore } from '@/store/useAppStore';
import { light, TEAMS, type TeamSlug } from '@/theme/tokens';

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
        <Text style={styles.title}>Choisis ton camp</Text>
        <Text style={styles.sub}>À Asnières · ton choix est définitif pour la saison</Text>
        {(Object.keys(TEAMS) as TeamSlug[]).map((slug) => {
          const t = TEAMS[slug];
          const sel = selected === slug;
          return (
            <Pressable
              key={slug}
              onPress={() => setSelected(slug)}
              style={[styles.card, { borderColor: sel ? t.color : light.border }, sel && { backgroundColor: t.color }]}>
              <Text style={styles.emoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, sel && { color: '#FFFFFF' }]}>{t.name}</Text>
                <Text style={[styles.desc, sel && { color: 'rgba(255,255,255,0.85)' }]}>
                  {sel ? 'Tu fais déjà partie de la vague' : 'Appuie pour rejoindre'}
                </Text>
              </View>
              <View style={[styles.dot, { backgroundColor: sel ? '#FFFFFF' : t.color }]} />
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={[styles.cta, !selected && { opacity: 0.4 }]} disabled={!selected} onPress={onConfirm}>
          <Text style={styles.ctaText}>{selected ? `Rejoindre ${TEAMS[selected].name}` : 'Sélectionne une équipe'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 24, paddingTop: 84, paddingBottom: 140 },
  title: { fontSize: 34, fontWeight: '800', color: light.text, letterSpacing: -1 },
  sub: { fontSize: 14, color: light.textMuted, fontWeight: '600', marginTop: 6, marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: light.surface,
    borderWidth: 2,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  emoji: { fontSize: 30 },
  name: { fontSize: 18, fontWeight: '800', color: light.text },
  desc: { fontSize: 12.5, fontWeight: '600', color: light.textMuted, marginTop: 2 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, paddingBottom: 40 },
  cta: { backgroundColor: '#1C1E24', borderRadius: 18, paddingVertical: 17, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
