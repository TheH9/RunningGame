// Onboarding — sombre immersif (maquette 01) : la promesse du jeu + pseudo.

import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MapCanvas } from '@/components/MapCanvas';
import { useAppStore } from '@/store/useAppStore';
import { dark } from '@/theme/tokens';

export default function Onboarding() {
  const [pseudo, setPseudo] = useState('');
  const setStorePseudo = useAppStore((s) => s.setPseudo);
  const complete = useAppStore((s) => s.completeOnboarding);
  const valid = pseudo.trim().length >= 2;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <MapCanvas dark />
      </View>
      <View style={styles.scrim} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <Text style={styles.logo}>BORNES</Text>
        <Text style={styles.title}>Cours.{'\n'}Peins ta ville.{'\n'}Défends-la.</Text>
        <Text style={styles.sub}>
          Chaque foulée peint ta trace à la couleur de ton équipe. De vrais lots à gagner dans tes rues.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ton pseudo"
          placeholderTextColor={dark.textMuted}
          value={pseudo}
          onChangeText={setPseudo}
          maxLength={20}
          autoCorrect={false}
        />
        <Pressable
          style={[styles.cta, !valid && { opacity: 0.4 }]}
          disabled={!valid}
          onPress={() => {
            setStorePseudo(pseudo.trim());
            complete();
            router.replace('/team');
          }}>
          <Text style={styles.ctaText}>Choisir mon équipe →</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,13,18,0.55)' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 28, paddingBottom: 56 },
  logo: { color: '#6AA6FF', fontSize: 15, fontWeight: '800', letterSpacing: 6, marginBottom: 14 },
  title: { color: '#FFFFFF', fontSize: 42, fontWeight: '800', lineHeight: 48, letterSpacing: -1.5 },
  sub: { color: dark.textMuted, fontSize: 15, lineHeight: 22, marginTop: 14, marginBottom: 26 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderRadius: 18,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 14,
  },
  cta: { backgroundColor: '#3B82F6', borderRadius: 18, paddingVertical: 17, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
