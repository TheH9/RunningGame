// Chips d'événements live — glass néon, max 2 visibles, auto-dismiss 4 s.

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRunEventsStore } from '../../store/useRunEventsStore';
import { c, font, TEAMS } from '../../theme/tokens';

export function LiveToastStack() {
  const queue = useRunEventsStore((s) => s.queue);
  const visible = queue.slice(-2);

  useEffect(() => {
    if (queue.length === 0) return;
    const oldest = queue[0];
    const t = setTimeout(() => useRunEventsStore.getState().consume(oldest.id), 4000);
    return () => clearTimeout(t);
  }, [queue]);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {visible.map((e) => (
        <Animated.View
          key={e.id}
          entering={FadeInDown.springify().damping(15)}
          exiting={FadeOutUp.duration(250)}
          style={[styles.chip, e.team ? { borderLeftColor: TEAMS[e.team].color, borderLeftWidth: 4 } : null]}>
          <Text style={styles.text}>{e.text}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center', gap: 8 },
  chip: {
    backgroundColor: 'rgba(20,22,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  text: { color: c.text, fontSize: 13, fontFamily: font.extrabold },
});
