// Primitives UI animées — le langage « jeu » de Bornes.
// Toutes basées sur reanimated : press élastiques, compteurs qui défilent,
// barres qui se remplissent, glass, néon, entrées en cascade.

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import Animated, {
  Easing, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withRepeat,
  withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { c, font, glass, glow, radius } from '../../theme/tokens';

const AP = Animated.createAnimatedComponent(Pressable);

// ---------- Pressable élastique (feedback tactile partout) ----------
export function Squish({
  children, onPress, onLongPress, delayLongPress, style, disabled, haptic,
  accessibilityLabel, accessibilityHint, accessibilityRole = 'button',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link';
}) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AP
      onPressIn={() => {
        s.value = withSpring(0.94, { damping: 15, stiffness: 400 });
        haptic?.();
      }}
      onPressOut={() => (s.value = withSpring(1, { damping: 12, stiffness: 300 }))}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[a, style]}>
      {children}
    </AP>
  );
}

// ---------- Carte en verre ----------
export function Glass({
  children, style, glowColor, entering, delay = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  entering?: boolean;
  delay?: number;
}) {
  const body = (
    <View style={[styles.glass, glowColor ? glow(glowColor, 26, 0.25) : null, style]}>
      <View style={styles.glassHi} pointerEvents="none" />
      {children}
    </View>
  );
  if (entering) {
    return <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)}>{body}</Animated.View>;
  }
  return body;
}

// ---------- Compteur qui défile ----------
export function Ticker({
  value, decimals = 0, style, duration = 900, suffix = '', prefix = '',
}: {
  value: number;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [display, setDisplay] = useState('0');
  const from = useSharedValue(0);
  useEffect(() => {
    const start = from.value;
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = start + (value - start) * eased;
      setDisplay(v.toFixed(decimals).replace('.', ','));
      if (k >= 1) {
        from.value = value;
        clearInterval(id);
      }
    }, 33);
    return () => clearInterval(id);
  }, [value, decimals, duration, from]);
  return (
    <Text style={style}>
      {prefix}
      {display}
      {suffix}
    </Text>
  );
}

// ---------- Barre de progression animée ----------
export function Bar({
  progress, color = c.violet, height = 8, glowOn = true, track = 'rgba(255,255,255,0.1)', delay = 0,
}: {
  progress: number; // 0..1
  color?: string;
  height?: number;
  glowOn?: boolean;
  track?: string;
  delay?: number;
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [progress, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { height: '100%', borderRadius: height / 2, backgroundColor: color },
          glowOn ? glow(color, 10, 0.9) : null,
          a,
        ]}
      />
    </View>
  );
}

// ---------- Halo qui respire (autour d'un élément vivant) ----------
export function Breathe({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [v]);
  const a = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + v.value * 0.12 }],
    opacity: 0.85 - v.value * 0.35,
  }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

// ---------- Anneau de niveau ----------
export function LevelRing({ level, progress, size = 52 }: { level: number; progress: number; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)' }]} />
      <RingProgress size={size} progress={progress} />
      <Text style={{ color: c.text, fontFamily: font.black, fontSize: size * 0.32 }}>{level}</Text>
      <Text style={{ color: c.textMuted, fontSize: 7, fontFamily: font.extrabold, letterSpacing: 1, marginTop: -2 }}>NIV</Text>
    </View>
  );
}

function RingProgress({ size, progress }: { size: number; progress: number }) {
  // anneau partiel via deux demi-cercles masqués (simple, sans svg)
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [progress, p]);
  const right = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(Math.min(p.value, 0.5), [0, 0.5], [0, 180])}deg` }],
  }));
  const left = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(Math.max(p.value, 0.5), [0.5, 1], [0, 180])}deg` }],
    opacity: p.value > 0.5 ? 1 : 0,
  }));
  const half: ViewStyle = { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: 'transparent' };
  return (
    <View style={{ width: size, height: size, position: 'absolute' }}>
      <View style={{ width: size, height: size, position: 'absolute', overflow: 'hidden' }}>
        <Animated.View style={[half, { borderTopColor: c.violet, borderRightColor: c.violet }, right]} />
      </View>
      <Animated.View style={[half, { borderTopColor: c.cyan, borderRightColor: c.cyan }, left]} />
    </View>
  );
}

// ---------- Flamme de streak ----------
export function Streak({ days }: { days: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: font.black, fontSize: 20, color: c.text }}>🔥{days}</Text>
      <Text style={{ fontSize: 8, fontFamily: font.extrabold, color: '#FF8A3C', letterSpacing: 0.5 }}>JOURS</Text>
    </View>
  );
}

// ---------- Label micro (uppercase tracking) ----------
export function Micro({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.micro, style]}>{children}</Text>;
}

// ---------- Titre display ----------
export function Display({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.display, style]}>{children}</Text>;
}

// ---------- Pop d'entrée (badge, médaille) ----------
export function Pop({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withSequence(withTiming(0, { duration: delay }), withSpring(1, { damping: 11, stiffness: 200 }));
  }, [s, delay]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: s.value }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  glass: {
    ...glass,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  glassHi: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  micro: { fontFamily: font.extrabold, fontSize: 9.5, color: c.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  display: { fontFamily: font.black, color: c.text, letterSpacing: -1 },
});
