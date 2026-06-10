// Compteur de zones du run — peintes / prises / contestées.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRunEventsStore } from '../../store/useRunEventsStore';

export function ZoneCounter() {
  const painted = useRunEventsStore((s) => s.zonesPainted);
  const captured = useRunEventsStore((s) => s.zonesCaptured);
  const contested = useRunEventsStore((s) => s.zonesContested);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.item}>
        <Text style={styles.value}>🎨 {painted}</Text>
        <Text style={styles.label}>zones</Text>
      </View>
      {captured > 0 && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: '#7CFC9B' }]}>💥 {captured}</Text>
          <Text style={styles.label}>prises</Text>
        </View>
      )}
      {contested > 0 && (
        <View style={styles.item}>
          <Text style={[styles.value, { color: '#FFD37C' }]}>⚔️ {contested}</Text>
          <Text style={styles.label}>contestées</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 14,
    flexDirection: 'column',
    gap: 6,
  },
  item: {
    backgroundColor: 'rgba(22,26,33,0.88)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    minWidth: 64,
  },
  value: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  label: { color: '#9AA3B2', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
