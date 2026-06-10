// Confettis — célébration des captures, lots et victoires de saison.

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { TEAMS } from '../../theme/tokens';

const COLORS = ['#7C5CFF', '#48B9FF', '#FF4D6A', '#FFD23C', '#2EE6A6', '#FFFFFF'];
const { width } = Dimensions.get('window');

function Piece({ i }: { i: number }) {
  const y = useSharedValue(-30);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const op = useSharedValue(1);
  const startX = (i / 24) * width + (Math.random() - 0.5) * 30;
  const color = COLORS[i % COLORS.length];
  const size = 6 + Math.random() * 7;
  const drift = (Math.random() - 0.5) * 120;
  const dur = 1600 + Math.random() * 1200;

  useEffect(() => {
    const delay = Math.random() * 400;
    y.value = withDelay(delay, withTiming(700, { duration: dur, easing: Easing.in(Easing.quad) }));
    x.value = withDelay(delay, withTiming(drift, { duration: dur }));
    rot.value = withDelay(delay, withTiming(Math.random() * 720 - 360, { duration: dur }));
    op.value = withDelay(delay + dur - 400, withTiming(0, { duration: 400 }));
  }, []);

  const a = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }],
    opacity: op.value,
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: startX, top: 0, width: size, height: size * 1.4, borderRadius: 2, backgroundColor: color },
        a,
      ]}
    />
  );
}

export function Confetti({ count = 26, run = true }: { count?: number; run?: boolean }) {
  if (!run) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <Piece key={i} i={i} />
      ))}
    </View>
  );
}

export const teamConfettiColor = (slug: keyof typeof TEAMS) => TEAMS[slug].color;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 700, zIndex: 80 },
});
