// Bouton GO/STOP néon — gradient, relief, anneaux concentriques, press élastique.

import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, glow } from '../theme/tokens';
import { Squish } from './ui';

type Props = {
  label: string;
  sub?: string;
  colors: [string, string, string];
  glowColor: string;
  size?: number;
  rings?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  haptic?: () => void;
};

export function NeonButton({
  label, sub, colors, glowColor, size = 108, rings = true, onPress, onLongPress, delayLongPress, haptic,
}: Props) {
  return (
    <Squish onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} haptic={haptic}>
      <View style={{ width: size + 52, height: size + 52, alignItems: 'center', justifyContent: 'center' }}>
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
          <Text style={[styles.label, { fontSize: size * 0.28 }]}>{label}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
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
