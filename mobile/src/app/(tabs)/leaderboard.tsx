// Ligue — Équipes (contrôle ville) / Coureurs / Amis. Dark glass + animations.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getBackend } from '@/backend/GameBackend';
import type { RunnerScore, TeamScore } from '@/backend/types';
import { Bar, Glass, Micro, Squish } from '@/components/ui';
import { c, font, TEAMS } from '@/theme/tokens';

type Segment = 'teams' | 'runners' | 'friends';

export default function Leaderboard() {
  const [segment, setSegment] = useState<Segment>('teams');
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [runners, setRunners] = useState<RunnerScore[]>([]);
  const [friends, setFriends] = useState<RunnerScore[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getBackend().getLeaderboards().then((d) => {
        if (!alive) return;
        setTeams(d.teams);
        setRunners(d.runners);
        setFriends(d.friends);
      }).catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const list = segment === 'runners' ? runners : friends;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>LIGUE</Text>
      <Text style={styles.sub}>Asnières · cette semaine</Text>

      <View style={styles.segments}>
        {([['teams', 'Équipes'], ['runners', 'Coureurs'], ['friends', 'Amis']] as [Segment, string][]).map(([key, label]) => (
          <Squish key={key} style={[styles.segment, segment === key && styles.segmentActive]} onPress={() => setSegment(key)}>
            <Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>{label}</Text>
          </Squish>
        ))}
      </View>

      {segment === 'teams' ? (
        <Glass style={styles.card}>
          <Micro style={{ marginBottom: 14 }}>Contrôle de la ville</Micro>
          <View style={styles.bar}>
            {teams.filter((t) => t.percent > 0).map((t) => (
              <View key={t.team} style={{ flex: t.percent, backgroundColor: TEAMS[t.team].color }} />
            ))}
          </View>
          {teams.map((t, i) => (
            <Animated.View key={t.team} entering={FadeInDown.delay(i * 70)} style={styles.row}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={[styles.dot, { backgroundColor: TEAMS[t.team].color, shadowColor: TEAMS[t.team].color }]} />
              <Text style={styles.rowName}>{TEAMS[t.team].emoji} {TEAMS[t.team].name}</Text>
              <Text style={[styles.rowValue, { color: TEAMS[t.team].color }]}>{t.percent}%</Text>
            </Animated.View>
          ))}
          <Text style={styles.hint}>Les zones non défendues pâlissent après 14 jours.</Text>
        </Glass>
      ) : (
        <Glass style={styles.card}>
          <Micro style={{ marginBottom: 12 }}>{segment === 'runners' ? 'Top peintres' : 'Entre amis'} · km peints</Micro>
          {list.map((r, i) => (
            <Animated.View key={r.pseudo} entering={FadeInDown.delay(i * 50)} style={[styles.row, r.isMe && styles.meRow]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={[styles.dot, { backgroundColor: TEAMS[r.team].color }]} />
              <Text style={[styles.rowName, r.isMe && { color: TEAMS[r.team].color }]}>
                {r.pseudo}{r.isMe ? ' (toi)' : ''}
              </Text>
              <Text style={styles.rowValue}>{r.paintedKm.toFixed(1).replace('.', ',')} km</Text>
            </Animated.View>
          ))}
          {list.length === 0 && <Text style={styles.hint}>Cours pour entrer au classement !</Text>}
        </Glass>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 18, paddingTop: 70, paddingBottom: 110 },
  title: { fontFamily: font.black, fontSize: 34, color: c.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: c.textMuted, fontFamily: font.bold, marginTop: 4, marginBottom: 16 },
  segments: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentActive: { backgroundColor: c.violet },
  segmentText: { fontSize: 13, fontFamily: font.extrabold, color: c.textMuted },
  segmentTextActive: { color: '#0A0B0F' },
  card: { padding: 18 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 7, overflow: 'hidden', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 12 },
  meRow: { backgroundColor: 'rgba(184,255,46,0.12)' },
  rank: { width: 18, fontSize: 13, fontFamily: font.black, color: c.textMuted },
  dot: { width: 9, height: 9, borderRadius: 3, shadowRadius: 6, shadowOpacity: 0.8 },
  rowName: { flex: 1, fontSize: 15, fontFamily: font.bold, color: c.text },
  rowValue: { fontSize: 14, fontFamily: font.extrabold, color: c.text },
  hint: { fontSize: 12, color: c.textMuted, fontFamily: font.bold, marginTop: 10, lineHeight: 17 },
});
