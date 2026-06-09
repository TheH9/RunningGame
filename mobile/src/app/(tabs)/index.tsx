// Map — l'écran principal (maquette 03) : territoire en veines + bouton GO.

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapCanvas } from '@/components/MapCanvas';
import { CITY_CONTROL } from '@/lib/mockData';
import { useAppStore } from '@/store/useAppStore';
import { light, TEAMS } from '@/theme/tokens';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const myShare = CITY_CONTROL.find((c) => c.team === team)?.percent ?? 0;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <MapCanvas team={team} />
      </View>

      <View style={[styles.hud, { top: insets.top + 8 }]}>
        <View>
          <Text style={styles.city}>Asnières</Text>
          <Text style={styles.hudSub}>Saison 1 · Trail Paint</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.share, { color: TEAMS[team].color }]}>{myShare} %</Text>
          <Text style={styles.hudSub}>{TEAMS[team].name}</Text>
        </View>
      </View>

      <View style={[styles.legend, { top: insets.top + 86 }]}>
        {CITY_CONTROL.map((c) => (
          <View key={c.team} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: TEAMS[c.team].color }]} />
            <Text style={styles.legendText}>{TEAMS[c.team].name.replace('Les ', '')}</Text>
          </View>
        ))}
      </View>

      <View style={styles.goWrap}>
        <Pressable style={[styles.go, { backgroundColor: TEAMS[team].color }]} onPress={() => router.push('/run')}>
          <Text style={styles.goText}>GO</Text>
          <Text style={styles.goSub}>START</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1F2937',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  city: { fontSize: 19, fontWeight: '800', color: light.text, letterSpacing: -0.3 },
  hudSub: { fontSize: 10, fontWeight: '700', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  share: { fontSize: 19, fontWeight: '800' },
  legend: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendText: { fontSize: 11.5, fontWeight: '700', color: '#3A3F4C' },
  goWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  go: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  goText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  goSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: -2 },
});
