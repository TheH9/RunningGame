// Éditeur d'avatar — style + graine (« mélanger ») + fond. Persiste dans le
// store (puis poussé au profil Supabase par l'effet d'init du _layout).

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Squish } from '@/components/ui';
import {
  AVATAR_BACKGROUNDS, AVATAR_STYLES, avatarFromSeed, randomSeed,
  type AvatarConfig, type AvatarStyleKey,
} from '@/lib/avatar';
import { useAppStore } from '@/store/useAppStore';
import { c, font } from '@/theme/tokens';

export default function AvatarEditor() {
  const pseudo = useAppStore((s) => s.pseudo);
  const team = useAppStore((s) => s.team);
  const stored = useAppStore((s) => s.avatar);
  const setAvatar = useAppStore((s) => s.setAvatar);

  const start = stored ?? avatarFromSeed(pseudo ?? 'moi');
  const [style, setStyle] = useState<AvatarStyleKey>(start.style);
  const [seed, setSeed] = useState(start.seed);
  const [bg, setBg] = useState(start.backgroundColor ?? 'transparent');

  const cfg: AvatarConfig = { style, seed, backgroundColor: bg };

  const save = () => {
    setAvatar(cfg);
    router.back();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>TON AVATAR</Text>
        <Text style={styles.sub}>Personnalise ta tête — elle te suit sur la carte.</Text>

        <View style={styles.previewWrap}>
          <Avatar config={cfg} team={team} size={168} ring />
        </View>

        <Squish style={styles.shuffle} onPress={() => setSeed(randomSeed())}>
          <Text style={styles.shuffleText}>🎲 Mélanger</Text>
        </Squish>

        <Text style={styles.section}>Style</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
          {AVATAR_STYLES.map((s) => (
            <Squish key={s.key} onPress={() => setStyle(s.key)} style={[styles.styleCard, style === s.key && styles.styleCardOn]}>
              <Avatar config={{ style: s.key, seed, backgroundColor: 'transparent' }} size={56} />
              <Text style={[styles.styleLabel, style === s.key && { color: c.text }]}>{s.label}</Text>
            </Squish>
          ))}
        </ScrollView>

        <Text style={styles.section}>Fond</Text>
        <View style={styles.rowGap}>
          {AVATAR_BACKGROUNDS.map((b) => (
            <Squish
              key={b}
              onPress={() => setBg(b)}
              style={[
                styles.swatch,
                { backgroundColor: b === 'transparent' ? 'rgba(255,255,255,0.06)' : `#${b}` },
                bg === b && styles.swatchOn,
              ]}
            >
              {b === 'transparent' && <Text style={styles.swatchNone}>∅</Text>}
            </Squish>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Squish style={styles.cta} onPress={save}>
          <Text style={styles.ctaText}>Enregistrer</Text>
        </Squish>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 120 },
  title: { fontFamily: font.black, fontSize: 30, color: c.text, letterSpacing: -1 },
  sub: { fontSize: 13.5, color: c.textMuted, fontFamily: font.bold, marginTop: 6, marginBottom: 20 },
  previewWrap: { alignItems: 'center', marginBottom: 14 },
  shuffle: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  shuffleText: { color: c.text, fontFamily: font.extrabold, fontSize: 14 },
  section: { color: c.textMuted, fontFamily: font.black, fontSize: 12, letterSpacing: 1.5, marginTop: 26, marginBottom: 12 },
  rowGap: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  styleCard: { alignItems: 'center', gap: 6, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  styleCardOn: { borderColor: c.violet, backgroundColor: 'rgba(124,92,255,0.12)' },
  styleLabel: { fontSize: 11, fontFamily: font.bold, color: c.textMuted },
  swatch: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderColor: c.text },
  swatchNone: { color: c.textMuted, fontSize: 18, fontFamily: font.bold },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, paddingBottom: 38, backgroundColor: c.bg },
  cta: { backgroundColor: c.violet, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#0A0B0F', fontSize: 16, fontFamily: font.extrabold },
});
