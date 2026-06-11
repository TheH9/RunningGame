// Splash animé : joue l'intro de marque (logo qui surgit + halo acid-green +
// wordmark) par-dessus le splash natif, puis se fond dans l'app. Affiché par le
// RootLayout tant qu'il n'a pas appelé onDone.

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing, FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withDelay,
  withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { c, font } from '@/theme/tokens';

const MARK = require('../../assets/images/splash-icon.png');

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const markScale = useSharedValue(0.7);
  const markOpacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const rootOpacity = useSharedValue(1);
  const rootScale = useSharedValue(1);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    markScale.value = withSequence(
      withTiming(1.06, { duration: 540, easing: Easing.out(Easing.back(1.7)) }),
      withTiming(1, { duration: 240 }),
    );
    // halo qui s'allume puis respire
    glow.value = withDelay(280, withSequence(
      withTiming(0.75, { duration: 620 }),
      withRepeat(withTiming(0.45, { duration: 900 }), -1, true),
    ));
    // sortie : léger zoom + fondu, puis on rend la main à l'app
    const t = setTimeout(() => {
      rootScale.value = withTiming(1.1, { duration: 480, easing: Easing.in(Easing.cubic) });
      rootOpacity.value = withTiming(0, { duration: 480 }, (fin) => {
        if (fin) runOnJS(onDone)();
      });
    }, 1550);
    return () => clearTimeout(t);
  }, []);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: rootOpacity.value,
    transform: [{ scale: rootScale.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.85 + glow.value * 0.5 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents="none">
      <Animated.View style={styles.markWrap}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.Image source={MARK} style={[styles.mark, markStyle]} resizeMode="contain" />
      </Animated.View>
      <Animated.Text entering={FadeIn.delay(430).duration(520)} style={styles.word}>BORNES</Animated.Text>
      <Animated.Text entering={FadeIn.delay(640).duration(520)} style={styles.tag}>Cours · Peins ta ville</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  markWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: c.green, opacity: 0.5,
  },
  mark: { width: 184, height: 184 },
  word: { color: c.text, fontFamily: font.black, fontSize: 42, letterSpacing: 2, marginTop: 18 },
  tag: { color: c.textMuted, fontFamily: font.bold, fontSize: 13.5, marginTop: 7, letterSpacing: 0.5 },
});
