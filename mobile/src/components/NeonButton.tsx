// Bouton GO/STOP néon — gradient, relief, anneaux concentriques, press élastique.

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { font, glow } from '../theme/tokens';
import { Squish } from './ui';

type Props = {
  label: string;
  sub?: string;
  colors: [string, string, string];
  glowColor: string;
  size?: number;
  rings?: boolean;
  pulse?: boolean;
  textColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  haptic?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function NeonButton({
  label, sub, colors, glowColor, size = 108, rings = true, pulse = false, textColor = '#FFFFFF',
  onPress, onLongPress, delayLongPress, haptic, accessibilityLabel, accessibilityHint,
}: Props) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (pulse) p.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse, p]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.16 }], opacity: 0.4 - p.value * 0.3 }));

  return (
    <Squish
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel ?? (sub ? `${label}, ${sub}` : label)}
      accessibilityHint={accessibilityHint}>
      <View style={{ width: size + 52, height: size + 52, alignItems: 'center', justifyContent: 'center' }}>
        {pulse && (
          <Animated.View
            style={[{ position: 'absolute', width: size + 18, height: size + 18, borderRadius: (size + 18) / 2, borderWidth: 2, borderColor: glowColor }, pulseStyle]}
          />
        )}
        {rings && (
          <>
            <View style={[styles.ring, { width: size + 28, height: size + 28, borderRadius: (size + 28) / 2, borderColor: glowColor, opacity: 0.35 }]} />
            <View style={[styles.ring, { width: size + 50, height: size + 50, borderRadius: (size + 50) / 2, borderColor: glowColor, opacity: 0.16 }]} />
          </>
        )}
        <LinearGradient
          colors={colors}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[
            { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
            glow(glowColor, 30, 0.7),
          ]}>
          <View style={[styles.innerHi, { width: size, height: size, borderRadius: size / 2 }]} pointerEvents="none" />
          <Text style={[styles.label, { fontSize: size * 0.28, color: textColor }]}>{label}</Text>
          {sub ? <Text style={[styles.sub, { color: textColor, opacity: 0.85 }]}>{sub}</Text> : null}
        </LinearGradient>
      </View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 2 },
  innerHi: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  label: { fontFamily: font.black, color: '#FFFFFF', letterSpacing: 1 },
  sub: { fontFamily: font.extrabold, fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.85)', marginTop: -2 },
});
