// Classement — branché sur le backend (simulé ou Supabase) :
// Équipes (contrôle de la ville) / Coureurs / Amis. Rafraîchi au focus.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getBackend } from '@/backend/GameBackend';
import type { RunnerScore, TeamScore } from '@/backend/types';
import { light, TEAMS } from '@/theme/tokens';

type Segment = 'teams' | 'runners' | 'friends';

export default function Leaderboard() {
  const [segment, setSegment] = useState<Segment>('teams');
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [runners, setRunners] = useState<RunnerScore[]>([]);
  const [friends, setFriends] = useState<RunnerScore[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getBackend()
        .getLeaderboards()
        .then((d) => {
          if (!alive) return;
          setTeams(d.teams);
          setRunners(d.runners);
          setFriends(d.friends);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const list = segment === 'runners' ? runners : friends;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Classement</Text>
      <Text style={styles.sub}>Asnières · cette semaine</Text>

      <View style={styles.segments}>
        {(
          [
            ['teams', 'Équipes'],
            ['runners', 'Coureurs'],
            ['friends', 'Amis'],
          ] as [Segment, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.segment, segment === key && styles.segmentActive]}
            onPress={() => setSegment(key)}>
            <Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {segment === 'teams' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contrôle de la ville</Text>
          <View style={styles.bar}>
            {teams
              .filter((t) => t.percent > 0)
              .map((t) => (
                <View key={t.team} style={{ flex: t.percent, backgroundColor: TEAMS[t.team].color }} />
              ))}
          </View>
          {teams.map((t, i) => (
            <View key={t.team} style={styles.row}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={[styles.dot, { backgroundColor: TEAMS[t.team].color }]} />
              <Text style={styles.rowName}>
                {TEAMS[t.team].emoji} {TEAMS[t.team].name}
              </Text>
              <Text style={[styles.rowValue, { color: TEAMS[t.team].color }]}>{t.percent} %</Text>
            </View>
          ))}
          <Text style={styles.hint}>% de zones contrôlées · les zones non défendues pâlissent après 14 jours</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{segment === 'runners' ? 'Top peintres' : 'Entre amis'} · km peints</Text>
          {list.map((r, i) => (
            <View key={r.pseudo} style={[styles.row, r.isMe && styles.meRow]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={[styles.dot, { backgroundColor: TEAMS[r.team].color }]} />
              <Text style={[styles.rowName, r.isMe && { color: TEAMS[r.team].color }]}>
                {r.pseudo}
                {r.isMe ? ' (toi)' : ''}
              </Text>
              <Text style={styles.rowValue}>{r.paintedKm.toFixed(1).replace('.', ',')} km</Text>
            </View>
          ))}
          {list.length === 0 && <Text style={styles.hint}>Cours pour entrer au classement !</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 20, paddingTop: 76, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: light.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: light.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 16 },
  segments: { flexDirection: 'row', backgroundColor: 'rgba(31,41,55,0.06)', borderRadius: 14, padding: 4, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  segmentActive: { backgroundColor: '#FFFFFF', shadowColor: '#1F2937', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  segmentText: { fontSize: 13, fontWeight: '700', color: light.textMuted },
  segmentTextActive: { color: light.text },
  card: { backgroundColor: light.surface, borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 7, overflow: 'hidden', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 12 },
  meRow: { backgroundColor: 'rgba(59,130,246,0.07)' },
  rank: { width: 18, fontSize: 13, fontWeight: '800', color: light.textMuted },
  dot: { width: 9, height: 9, borderRadius: 3 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '700', color: light.text },
  rowValue: { fontSize: 14, fontWeight: '800', color: light.text },
  hint: { fontSize: 12, color: light.textMuted, fontWeight: '600', marginTop: 10, lineHeight: 17 },
});
