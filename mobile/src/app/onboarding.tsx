// Onboarding — sombre immersif, typo XXL, accroche « jeu ».

import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { MapView } from '@/components/map/MapView';
import { Squish } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { c, font, VIOLET } from '@/theme/tokens';

export default function Onboarding() {
  const [pseudo, setPseudo] = useState('');
  const setStorePseudo = useAppStore((s) => s.setPseudo);
  const complete = useAppStore((s) => s.completeOnboarding);
  const valid = pseudo.trim().length >= 2;

  return (
    <View style={styles.root}>
      <View style={styles.fill}>
        <MapView dark interactive={false} initialScale={0.85} />
      </View>
      <View style={styles.scrim} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <Animated.Text entering={FadeIn.duration(600)} style={styles.logo}>
          BORNES
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).springify().damping(16)} style={styles.title}>
          COURS.{'\n'}PEINS TA VILLE.{'\n'}DÉFENDS-LA.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(300).springify().damping(16)} style={styles.sub}>
          Le jeu de territoire qui transforme tes runs en conquête. Ta trace peint la carte aux couleurs de ton
          équipe — de vrais lots à gagner dans tes rues.
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(450).springify().damping(16)} style={{ alignSelf: 'stretch' }}>
          <TextInput
            style={styles.input}
            placeholder="Ton pseudo de joueur"
            placeholderTextColor={c.textMuted}
            value={pseudo}
            onChangeText={setPseudo}
            maxLength={20}
            autoCorrect={false}
          />
          <Squish
            style={[styles.cta, !valid && { opacity: 0.4 }]}
            disabled={!valid}
            onPress={() => {
              setStorePseudo(pseudo.trim());
              complete();
              router.replace('/team');
            }}>
            <Text style={styles.ctaText}>Choisir mon équipe →</Text>
          </Squish>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,9,13,0.62)' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 28, paddingBottom: 54 },
  logo: { color: VIOLET, fontFamily: font.black, fontSize: 15, letterSpacing: 7, marginBottom: 14 },
  title: { color: c.text, fontFamily: font.black, fontSize: 40, lineHeight: 44, letterSpacing: -1.5 },
  sub: { color: c.textDim, fontFamily: font.bold, fontSize: 14.5, lineHeight: 21, marginTop: 14, marginBottom: 26 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderRadius: 18,
    color: c.text,
    fontSize: 16,
    fontFamily: font.bold,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 14,
  },
  cta: { backgroundColor: VIOLET, borderRadius: 18, paddingVertical: 17, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: font.extrabold },
});
