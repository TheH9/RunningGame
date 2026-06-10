// Fin de run (maquette 05 ⭐) — la story animée partageable + stats.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShareCard } from '@/components/ShareCard';
import { formatDuration, formatKm, formatPace } from '@/lib/geo';
import { shareRunCard } from '@/lib/share';
import { useAppStore } from '@/store/useAppStore';
import { useRunStore } from '@/store/useRunStore';
import { dark, TEAMS } from '@/theme/tokens';

export default function Summary() {
  const pseudo = useAppStore((s) => s.pseudo) ?? 'Coureur';
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const summary = useRunStore((s) => s.lastSummary);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const t = TEAMS[team];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  if (!summary) {
    router.replace('/(tabs)');
    return null;
  }

  const paintedKm = formatKm(summary.paintedM);
  const distanceKm = formatKm(summary.distanceM);
  const duration = formatDuration(summary.elapsedMs);
  const pace = formatPace(summary.distanceM, summary.elapsedMs);

  const onShare = async () => {
    setSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const res = await shareRunCard(cardRef);
    setSharing(false);
    if (res === 'unavailable') Alert.alert('Partage indisponible', "Le partage n'est pas dispo sur cet appareil.");
    else if (res === 'error') Alert.alert('Oups', 'Impossible de générer l’image pour le moment.');
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
          <ShareCard
            points={summary.points}
            team={team}
            paintedKm={paintedKm}
            distanceKm={distanceKm}
            duration={duration}
            pace={pace}
            pseudo={pseudo}
          />
        </View>

        <Text style={styles.title}>Belle trace. 🔥</Text>
        <Text style={styles.sub}>Elle rejoint le territoire {t.name.toLowerCase()} — et elle compte dès maintenant.</Text>

        <Pressable style={[styles.share, { backgroundColor: t.color }, sharing && { opacity: 0.6 }]} disabled={sharing} onPress={onShare}>
          <Text style={styles.shareText}>{sharing ? 'Préparation…' : 'Partager ma story'}</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backText}>Retour à la carte</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  scroll: { padding: 22, paddingTop: 56, paddingBottom: 50 },
  cardWrap: { borderRadius: 24, overflow: 'hidden', marginBottom: 22 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  sub: { color: dark.textMuted, fontSize: 14.5, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  share: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  shareText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },
  back: { borderRadius: 18, paddingVertical: 15, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  backText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
});
