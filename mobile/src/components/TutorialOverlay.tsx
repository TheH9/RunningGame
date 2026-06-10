// Tutoriel du premier lancement — 3 étapes sur la carte.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAppStore } from '../store/useAppStore';

const STEPS = [
  { emoji: '🗺', title: 'La ville est le plateau', text: 'Chaque rue peut être peinte aux couleurs d’une équipe. Tape une rue colorée pour voir qui la tient.' },
  { emoji: '👟', title: 'GO pour peindre', text: 'Appuie sur GO et cours : ta trace peint la ville en direct. Repasse sur les rues adverses pour les reprendre.' },
  { emoji: '🛡', title: 'Défends ton territoire', text: 'Dézoome pour voir le score en hexagones. À la fin de la saison, la carte est remise à zéro — défends ta couleur !' },
];

export function TutorialOverlay() {
  const tutorialSeen = useAppStore((s) => s.tutorialSeen);
  const markSeen = useAppStore((s) => s.markTutorialSeen);
  const [step, setStep] = useState(0);

  if (tutorialSeen) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Animated.View entering={FadeIn} style={styles.overlay}>
      <Animated.View key={step} entering={FadeInDown.springify().damping(16)} style={styles.card}>
        <Text style={styles.emoji}>{s.emoji}</Text>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.text}>{s.text}</Text>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={() => (last ? markSeen() : setStep(step + 1))}>
          <Text style={styles.ctaText}>{last ? 'C’est parti 🔥' : 'Suivant →'}</Text>
        </Pressable>
        {!last && (
          <Pressable onPress={markSeen}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,17,22,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 50 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 26, padding: 24, alignItems: 'center', alignSelf: 'stretch' },
  emoji: { fontSize: 42 },
  title: { fontSize: 20, fontWeight: '800', color: '#1C1E24', marginTop: 10, letterSpacing: -0.5, textAlign: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: '#5A606B', lineHeight: 21, textAlign: 'center', marginTop: 8 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(31,41,55,0.15)' },
  dotActive: { backgroundColor: '#3B82F6', width: 18 },
  cta: { backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center', alignSelf: 'stretch' },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  skip: { fontSize: 13, fontWeight: '700', color: '#8A8FA0', marginTop: 12 },
});
