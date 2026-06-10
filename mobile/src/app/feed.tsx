// Feed d'activité — ouvert par la cloche du HUD map. Le feuilleton du quartier.

import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSocialStore } from '@/store/useSocialStore';
import { light, TEAMS } from '@/theme/tokens';

function ago(at: number): string {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function Feed() {
  const feed = useSocialStore((s) => s.feed);

  useEffect(() => {
    useSocialStore.getState().hydrate().catch(() => {});
    useSocialStore.getState().markFeedRead();
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Activité</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {feed.map((e) => (
          <View key={e.id} style={styles.row}>
            {e.team ? <View style={[styles.dot, { backgroundColor: TEAMS[e.team].color }]} /> : <View style={[styles.dot, { backgroundColor: '#C2C8D2' }]} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{e.text}</Text>
              <Text style={styles.time}>{ago(e.at)}</Text>
            </View>
          </View>
        ))}
        {feed.length === 0 && <Text style={styles.empty}>Rien pour l’instant — cours pour faire parler de toi. 🏃</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 64 },
  title: { fontSize: 26, fontWeight: '800', color: light.text, letterSpacing: -0.7 },
  close: { fontSize: 18, color: light.textMuted, fontWeight: '700', padding: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(31,41,55,0.05)' },
  dot: { width: 10, height: 10, borderRadius: 4, marginTop: 5 },
  text: { fontSize: 14, fontWeight: '600', color: light.text, lineHeight: 20 },
  time: { fontSize: 11, fontWeight: '600', color: light.textMuted, marginTop: 3 },
  empty: { fontSize: 13.5, color: light.textMuted, fontWeight: '600', paddingVertical: 20, textAlign: 'center' },
});
