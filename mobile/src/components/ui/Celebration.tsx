// Célébration plein écran — level-up & badges. Le moment de fierté :
// rayons qui tournent, médaille qui surgit en ressort, confettis, tap pour continuer.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { c, ENERGY, font } from '../../theme/tokens';
import { Confetti } from './Confetti';

export function Celebration() {
  const celebration = useGameStore((s) => s.pendingCelebration);
  const clear = useGameStore((s) => s.clearCelebration);

  const spin = useSharedValue(0);
  const pop = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!celebration) return;
    spin.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1);
    pop.value = withDelay(150, withSpring(1, { damping: 9, stiffness: 140 }));
    glow.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [celebration, spin, pop, glow]);

  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { rotate: `${(1 - pop.value) * -40}deg` }],
    opacity: pop.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + glow.value * 0.18 }], opacity: 0.5 + glow.value * 0.4 }));
  const textStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ translateY: (1 - pop.value) * 20 }] }));

  if (!celebration) return null;
  const isLevel = celebration.kind === 'levelup';

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut} style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={clear} />
      <Confetti run count={30} />

      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.rays, raysStyle]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={[styles.ray, { transform: [{ rotate: `${i * 30}deg` }] }]} />
          ))}
        </Animated.View>
        <Animated.View style={[styles.halo, glowStyle]} />
        <Animated.View style={[styles.medal, medalStyle]}>
          <Text style={styles.medalEmoji}>{isLevel ? '🆙' : '🏅'}</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.textWrap, textStyle]} pointerEvents="none">
        <Text style={styles.kicker}>{isLevel ? 'NIVEAU SUPÉRIEUR' : 'BADGE DÉBLOQUÉ'}</Text>
        <Text style={styles.title}>{celebration.label}</Text>
        <Text style={styles.tap}>Touche pour continuer</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,9,13,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 4, height: 220, backgroundColor: 'rgba(184,255,46,0.12)', borderRadius: 2 },
  halo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: ENERGY, opacity: 0.5 },
  medal: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#14161E', borderWidth: 2, borderColor: ENERGY, alignItems: 'center', justifyContent: 'center', shadowColor: ENERGY, shadowOpacity: 0.8, shadowRadius: 30 },
  medalEmoji: { fontSize: 60 },
  textWrap: { position: 'absolute', bottom: 150, alignItems: 'center', paddingHorizontal: 30 },
  kicker: { color: ENERGY, fontFamily: font.black, fontSize: 13, letterSpacing: 3 },
  title: { color: c.text, fontFamily: font.black, fontSize: 34, letterSpacing: -1, marginTop: 8, textAlign: 'center' },
  tap: { color: c.textMuted, fontFamily: font.bold, fontSize: 13, marginTop: 18 },
});
