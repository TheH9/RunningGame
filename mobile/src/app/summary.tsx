// Fin de run — story 9:16 animée + gains de jeu (XP, badges) + confettis.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Confetti } from '@/components/ui/Confetti';
import { ShareCard } from '@/components/ShareCard';
import { Glass, Micro, Squish, Ticker } from '@/components/ui';
import { formatDuration, formatKm, formatPace } from '@/lib/geo';
import { shareRunCard } from '@/lib/share';
import { useAppStore } from '@/store/useAppStore';
import { useGameStore } from '@/store/useGameStore';
import { useRunStore } from '@/store/useRunStore';
import { c, font, TEAMS, VIOLET } from '@/theme/tokens';

export default function Summary() {
  const pseudo = useAppStore((s) => s.pseudo) ?? 'Coureur';
  const team = useAppStore((s) => s.team) ?? 'vagues';
  const summary = useRunStore((s) => s.lastSummary);
  const celebration = useGameStore((s) => s.pendingCelebration);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const t = TEAMS[team];
  const big = !!summary && !summary.tooShort && !summary.invalidated && (celebration?.kind === 'levelup' || summary.cells.length >= 6);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return () => useGameStore.getState().clearCelebration();
  }, []);

  if (!summary) {
    router.replace('/(tabs)');
    return null;
  }

  if (summary.tooShort) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 52, marginBottom: 14 }}>🐣</Text>
        <Text style={styles.title}>Trop court pour peindre</Text>
        <Text style={styles.sub}>Il faut au moins 100 m pour laisser une trace. La prochaine sera la bonne !</Text>
        <Squish style={[styles.back, { alignSelf: 'stretch', marginTop: 14 }]} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backText}>Retour à la carte</Text>
        </Squish>
      </View>
    );
  }

  const paintedKm = formatKm(summary.paintedM);
  const onShare = async () => {
    setSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const res = await shareRunCard(cardRef);
    setSharing(false);
    if (res === 'unavailable') Alert.alert('Partage indisponible', "Pas dispo sur cet appareil.");
    else if (res === 'error') Alert.alert('Oups', 'Impossible de générer l’image.');
  };

  return (
    <View style={styles.root}>
      <Confetti run={big} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {celebration?.kind === 'levelup' && (
          <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.levelup}>
            <Text style={styles.levelupText}>🆙 {celebration.label}</Text>
          </Animated.View>
        )}

        <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
          <ShareCard
            points={summary.points}
            team={team}
            paintedKm={paintedKm}
            distanceKm={formatKm(summary.distanceM)}
            duration={formatDuration(summary.elapsedMs)}
            pace={formatPace(summary.distanceM, summary.elapsedMs)}
            pseudo={pseudo}
          />
        </View>

        <Text style={styles.title}>Belle trace. 🔥</Text>
        <Text style={styles.sub}>Elle rejoint le territoire {t.name.toLowerCase()} — et elle compte dès maintenant.</Text>

        <View style={styles.gains}>
          <Glass style={styles.gain}>
            <Ticker value={summary.cells.length} style={styles.gainValue} />
            <Micro>zones touchées</Micro>
          </Glass>
          <Glass style={styles.gain} glowColor={VIOLET}>
            <Ticker value={useGameStore.getState().lastGain} prefix="+" suffix=" XP" style={[styles.gainValue, { color: c.violet2 }]} />
            <Micro>expérience</Micro>
          </Glass>
        </View>

        <Squish style={[styles.share, { backgroundColor: t.color }, sharing && { opacity: 0.6 }]} disabled={sharing} onPress={onShare}>
          <Text style={styles.shareText}>{sharing ? 'Préparation…' : 'Partager ma story'}</Text>
        </Squish>
        <Squish style={styles.back} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backText}>Retour à la carte</Text>
        </Squish>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 20, paddingTop: 54, paddingBottom: 50 },
  levelup: { alignSelf: 'center', backgroundColor: VIOLET, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 16 },
  levelupText: { color: '#0A0B0F', fontFamily: font.black, fontSize: 16 },
  cardWrap: { borderRadius: 24, overflow: 'hidden', marginBottom: 22 },
  title: { color: c.text, fontFamily: font.black, fontSize: 30, letterSpacing: -1 },
  sub: { color: c.textMuted, fontFamily: font.bold, fontSize: 14.5, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  gains: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  gain: { flex: 1, padding: 16, alignItems: 'flex-start' },
  gainValue: { color: c.text, fontFamily: font.black, fontSize: 24, letterSpacing: -0.5, marginBottom: 2 },
  share: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  shareText: { color: '#FFFFFF', fontSize: 15.5, fontFamily: font.extrabold },
  back: { borderRadius: 18, paddingVertical: 15, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  backText: { color: c.text, fontSize: 14.5, fontFamily: font.bold },
});
