// Compteur de zones du run — glass, peintes / prises / contestées.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRunEventsStore } from '../../store/useRunEventsStore';
import { c, font } from '../../theme/tokens';

export function ZoneCounter() {
  const painted = useRunEventsStore((s) => s.zonesPainted);
  const captured = useRunEventsStore((s) => s.zonesCaptured);
  const contested = useRunEventsStore((s) => s.zonesContested);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Chip value={`🎨 ${painted}`} label="zones" />
      {captured > 0 && <Chip value={`💥 ${captured}`} label="prises" color={c.green} />}
      {contested > 0 && <Chip value={`⚔️ ${contested}`} label="contestées" color={c.gold} />}
    </View>
  );
}

function Chip({ value, label, color = c.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 14, gap: 6 },
  chip: {
    backgroundColor: 'rgba(20,22,30,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    minWidth: 66,
  },
  value: { color: c.text, fontSize: 14, fontFamily: font.black },
  label: { color: c.textMuted, fontSize: 8, fontFamily: font.extrabold, textTransform: 'uppercase', letterSpacing: 0.4 },
});
