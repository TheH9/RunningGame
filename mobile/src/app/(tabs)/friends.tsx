// Défis — duels 7 jours entre amis (« qui peint le plus »), liste des
// rivaux du quartier, invitation par partage.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { Duel, Rival } from '@/backend/types';
import { useAppStore } from '@/store/useAppStore';
import { useSocialStore } from '@/store/useSocialStore';
import { light, TEAMS } from '@/theme/tokens';

function DuelCard({ duel, rival }: { duel: Duel; rival: Rival }) {
  const myTeam = useAppStore((s) => s.team) ?? 'vagues';
  const total = Math.max(1, duel.myPaintedM + duel.rivalPaintedM);
  const myPct = (duel.myPaintedM / total) * 100;
  const daysLeft = Math.max(0, Math.ceil((duel.endsAt - Date.now()) / (24 * 3600 * 1000)));
  const leading = duel.myPaintedM >= duel.rivalPaintedM;

  return (
    <View style={styles.duelCard}>
      <View style={styles.duelHeader}>
        <Text style={styles.duelTitle}>
          ⚔️ Toi vs {rival.emoji} {rival.pseudo}
        </Text>
        <Text style={[styles.duelStatus, duel.status !== 'active' && (duel.status === 'won' ? styles.won : styles.lost)]}>
          {duel.status === 'active' ? `J-${daysLeft}` : duel.status === 'won' ? 'GAGNÉ 🏆' : 'PERDU'}
        </Text>
      </View>
      <View style={styles.duelTrack}>
        <View style={[styles.duelMe, { width: `${Math.max(4, Math.min(96, myPct))}%`, backgroundColor: TEAMS[myTeam].color }]} />
        <View style={[styles.duelRival, { backgroundColor: TEAMS[rival.team].color }]} />
      </View>
      <View style={styles.duelNumbers}>
        <Text style={[styles.duelKm, { color: TEAMS[myTeam].color }]}>{(duel.myPaintedM / 1000).toFixed(1).replace('.', ',')} km</Text>
        <Text style={styles.duelHint}>
          {duel.status === 'active'
            ? leading
              ? 'Tu mènes — ne lâche rien !'
              : `${((duel.rivalPaintedM - duel.myPaintedM) / 1000).toFixed(1).replace('.', ',')} km de retard`
            : 'Duel terminé'}
        </Text>
        <Text style={[styles.duelKm, { color: TEAMS[rival.team].color }]}>{(duel.rivalPaintedM / 1000).toFixed(1).replace('.', ',')} km</Text>
      </View>
    </View>
  );
}

export default function Friends() {
  const rivals = useSocialStore((s) => s.rivals);
  const duels = useSocialStore((s) => s.duels);
  const challenge = useSocialStore((s) => s.challenge);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      useSocialStore.getState().hydrate().catch(() => {});
      useSocialStore.getState().refresh().catch(() => {});
    }, []),
  );

  const friends = rivals.filter((r) => r.isFriend);
  const others = rivals.filter((r) => !r.isFriend);
  const activeDuelRivals = new Set(duels.filter((d) => d.status === 'active').map((d) => d.rivalId));

  const invite = async () => {
    const msg = 'Rejoins-moi sur Bornes — on peint la ville en courant. Je te défie sur 7 jours ! https://bornes.app/invite/demo';
    if (Platform.OS === 'web') return;
    Share.share({ message: msg }).catch(() => {});
  };

  const onChallenge = async (r: Rival) => {
    setBusy(r.id);
    try {
      await challenge(r.id);
    } finally {
      setBusy(null);
    }
  };

  const renderRival = (r: Rival) => (
    <View key={r.id} style={styles.row}>
      <Text style={styles.emoji}>{r.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.pseudo}>
          {r.pseudo} <Text style={{ color: TEAMS[r.team].color }}>·</Text>{' '}
          <Text style={[styles.teamName, { color: TEAMS[r.team].color }]}>{TEAMS[r.team].name.replace('Les ', '')}</Text>
        </Text>
        <Text style={styles.meta}>
          {(r.weekPaintedM / 1000).toFixed(1).replace('.', ',')} km cette semaine{r.title ? ` · ${r.title}` : ''}
        </Text>
      </View>
      {activeDuelRivals.has(r.id) ? (
        <View style={styles.inDuel}>
          <Text style={styles.inDuelText}>⚔️ en duel</Text>
        </View>
      ) : (
        <Pressable style={[styles.challengeBtn, busy === r.id && { opacity: 0.5 }]} disabled={busy === r.id} onPress={() => onChallenge(r)}>
          <Text style={styles.challengeText}>Défier</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Défis</Text>
      <Text style={styles.sub}>7 jours · celui qui peint le plus gagne</Text>

      {duels.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          {duels.slice(0, 4).map((d) => {
            const rival = rivals.find((r) => r.id === d.rivalId);
            return rival ? <DuelCard key={d.id} duel={d} rival={rival} /> : null;
          })}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mes amis</Text>
        {friends.map(renderRival)}
        {friends.length === 0 && <Text style={styles.empty}>Invite tes amis pour les défier !</Text>}
      </View>

      <Pressable style={styles.invite} onPress={invite}>
        <Text style={styles.inviteText}>📨 Inviter un ami sur Bornes</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coureurs du quartier</Text>
        {others.map(renderRival)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 20, paddingTop: 76, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: light.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: light.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 18 },
  duelCard: { backgroundColor: '#1C1E24', borderRadius: 20, padding: 16, marginBottom: 12 },
  duelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  duelTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  duelStatus: { color: '#9AA3B2', fontSize: 12, fontWeight: '800' },
  won: { color: '#7CFC9B' },
  lost: { color: '#FF9AA3' },
  duelTrack: { flexDirection: 'row', height: 12, borderRadius: 7, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  duelMe: { height: '100%' },
  duelRival: { flex: 1, height: '100%' },
  duelNumbers: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  duelKm: { fontSize: 13, fontWeight: '800' },
  duelHint: { color: '#9AA3B2', fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: light.surface, borderRadius: 22, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  emoji: { fontSize: 24 },
  pseudo: { fontSize: 15, fontWeight: '800', color: light.text },
  teamName: { fontSize: 12.5, fontWeight: '700' },
  meta: { fontSize: 11.5, fontWeight: '600', color: light.textMuted, marginTop: 2 },
  challengeBtn: { backgroundColor: '#1C1E24', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  challengeText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  inDuel: { backgroundColor: 'rgba(31,41,55,0.07)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  inDuelText: { color: light.textMuted, fontSize: 12, fontWeight: '700' },
  invite: { backgroundColor: '#3B82F6', borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  inviteText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  empty: { fontSize: 13, color: light.textMuted, fontWeight: '600', paddingVertical: 6 },
});
