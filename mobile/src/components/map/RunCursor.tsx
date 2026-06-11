// Curseur GPS fixe pendant le run — halo qui respire + flèche orientée par le
// cap. Overlay écran partagé par les deux rendus de carte : le raster lui passe
// en plus un décalage « lookahead » (lookX/lookY), le natif le laisse centré
// (c'est la caméra qui anticipe).

import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

type Props = {
  teamColor: string;
  bearing: SharedValue<number>;
  lookX?: SharedValue<number>;
  lookY?: SharedValue<number>;
  cx: number;
  cy: number;
};

export function RunCursor({ teamColor, bearing, lookX, lookY, cx, cy }: Props) {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [breathe]);

  const cursorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX?.value ?? 0 }, { translateY: lookY?.value ?? 0 }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bearing.value}deg` }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.35 }],
    opacity: 0.3 - breathe.value * 0.15,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.cursor, { left: cx - 28, top: cy - 28 }, cursorStyle]}>
      <Animated.View style={[styles.halo, { backgroundColor: teamColor }, haloStyle]} />
      <Animated.View style={[styles.arrowWrap, arrowStyle]}>
        <View style={[styles.arrowBody, { backgroundColor: teamColor }]}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M12 3l7 16-7-4-7 4z" fill="#FFFFFF" />
          </Svg>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cursor: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  arrowWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  arrowBody: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 }
      : {}),
  },
});
