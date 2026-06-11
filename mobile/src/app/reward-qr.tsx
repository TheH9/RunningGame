// QR du lot gagné — à montrer en boutique partenaire (filigrane DÉMO).

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getBackend } from '@/backend/GameBackend';
import type { RewardItem } from '@/backend/types';
import { light } from '@/theme/tokens';

export default function RewardQr() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<RewardItem | null>(null);

  useEffect(() => {
    getBackend()
      .getChest()
      .then((chest) => setItem(chest.find((c) => c.id === id) ?? chest[0] ?? null))
      .catch(() => {});
  }, [id]);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {item ? (
          <>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.partner}>{item.partner}</Text>
            <View style={styles.qrBox}>
              <QRCode value={item.qrPayload} size={190} backgroundColor="#FFFFFF" color="#1C1E24" />
            </View>
            <Text style={styles.hint}>Montre ce code en boutique pour récupérer ton lot.</Text>
            <Text style={styles.code}>{item.qrPayload}</Text>
          </>
        ) : (
          <Text style={styles.hint}>Lot introuvable.</Text>
        )}
        <Pressable style={styles.close} onPress={() => router.back()}>
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(14,17,22,0.92)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 26, alignItems: 'center', alignSelf: 'stretch' },
  emoji: { fontSize: 40 },
  title: { fontSize: 21, fontWeight: '800', color: light.text, marginTop: 8, letterSpacing: -0.5, textAlign: 'center' },
  partner: { fontSize: 13, fontWeight: '700', color: light.textMuted, marginTop: 4, marginBottom: 18 },
  qrBox: { padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(31,41,55,0.08)', alignItems: 'center' },
  hint: { fontSize: 13, fontWeight: '600', color: light.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 19 },
  code: { fontSize: 11, fontWeight: '700', color: light.textMuted, marginTop: 6, letterSpacing: 0.5 },
  close: { marginTop: 20, backgroundColor: '#1C1E24', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 40 },
  closeText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
});
