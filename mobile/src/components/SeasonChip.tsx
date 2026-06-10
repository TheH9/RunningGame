// Pastille de saison « S1 · J-41 » — pulse en rouge sur les 3 derniers jours.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSeasonStore } from '../store/useSeasonStore';

export function SeasonChip({ onDark = false }: { onDark?: boolean }) {
  const current = useSeasonStore((s) => s.current);
  const daysLeft = useSeasonStore((s) => s.daysLeft)();
  if (!current) return null;
  const urgent = daysLeft <= 3;

  return (
    <View style={[styles.chip, onDark && styles.chipDark, urgent && styles.chipUrgent]}>
      <Text style={[styles.text, onDark && { color: '#C7CDD6' }, urgent && { color: '#FFFFFF' }]}>
        S{current.number} · J-{daysLeft}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(31,41,55,0.07)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  chipDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  chipUrgent: { backgroundColor: '#FF4D5E' },
  text: { fontSize: 10.5, fontWeight: '800', color: '#5A606B', letterSpacing: 0.3 },
});
