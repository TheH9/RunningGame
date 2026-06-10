// Défis — duels 7 jours entre amis, rivaux du quartier, invitation.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { Duel, Rival } from '@/backend/types';
import { Glass, Micro, Squish } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useSocialStore } from '@/store/useSocialStore';
import { c, font, TEAMS } from '@/theme/tokens';

function DuelCard({ duel, rival }: { duel: Duel; rival: Rival }) {
  const myTeam = useAppStore((s) => s.team) ?? 'vagues';
  const total = Math.max(1, duel.myPaintedM + duel.rivalPaintedM);
  const myPct = (duel.myPaintedM / total) * 100;
  const daysLeft = Math.max(0, Math.ceil((duel.endsAt - Date.now()) / (24 * 3600 * 1000)));
  const leading = duel.myPaintedM >= duel.rivalPaintedM;

  return (
    <View style={styles.duelCard}>
      <View style={styles.duelHeader}>
        <Text style={styles.duelTitle}>⚔️ Toi vs {rival.emoji} {rival.pseudo}</Text>
        <Text style={[styles.duelStatus, duel.status === 'won' && { color: c.green }, duel.status === 'lost' && { color: c.red }]}>
          {duel.status === 'active' ? `J-${daysLeft}` : duel.status === 'won' ? 'GAGNÉ 🏆' : 'PERDU'}
        </Text>
      </View>
      <View style={styles.duelTrack}>
        <View style={{ width: `${Math.max(4, Math.min(96, myPct))}%`, backgroundColor: TEAMS[myTeam].color }} />
        <View style={{ flex: 1, backgroundColor: TEAMS[rival.team].color }} />
      </View>
      <View style={styles.duelNumbers}>
        <Text style={[styles.duelKm, { color: TEAMS[myTeam].color }]}>{(duel.myPaintedM / 1000).toFixed(1).replace('.', ',')} km</Text>
        <Text style={styles.duelHint}>
          {duel.status === 'active' ? (leading ? 'Tu mènes — ne lâche rien !' : `${((duel.rivalPaintedM - duel.myPaintedM) / 1000).toFixed(1).replace('.', ',')} km de retard`) : 'Duel terminé'}
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
  const activeDuels = new Set(duels.filter((d) => d.status === 'active').map((d) => d.rivalId));

  const invite = async () => {
    if (Platform.OS === 'web') return;
    Share.share({ message: 'Rejoins-moi sur Bornes — on peint la ville en courant. Je te défie ! https://bornes.app/invite/demo' }).catch(() => {});
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
          {r.pseudo} <Text style={[styles.teamName, { color: TEAMS[r.team].color }]}>· {TEAMS[r.team].name.replace('Les ', '')}</Text>
        </Text>
        <Text style={styles.meta}>{(r.weekPaintedM / 1000).toFixed(1).replace('.', ',')} km cette semaine{r.title ? ` · ${r.title}` : ''}</Text>
      </View>
      {activeDuels.has(r.id) ? (
        <View style={styles.inDuel}><Text style={styles.inDuelText}>⚔️ en duel</Text></View>
      ) : (
        <Squish style={[styles.challengeBtn, busy === r.id && { opacity: 0.5 }]} disabled={busy === r.id} onPress={() => onChallenge(r)}>
          <Text style={styles.challengeText}>Défier</Text>
        </Squish>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>DÉFIS</Text>
      <Text style={styles.sub}>7 jours · celui qui peint le plus gagne</Text>

      {duels.slice(0, 4).map((d) => {
        const rival = rivals.find((r) => r.id === d.rivalId);
        return rival ? <DuelCard key={d.id} duel={d} rival={rival} /> : null;
      })}

      <Glass style={styles.card}>
        <Micro style={{ marginBottom: 10 }}>Mes amis</Micro>
        {friends.map(renderRival)}
        {friends.length === 0 && <Text style={styles.empty}>Invite tes amis pour les défier !</Text>}
      </Glass>

      <Squish style={styles.invite} onPress={invite}>
        <Text style={styles.inviteText}>📨 Inviter un ami sur Bornes</Text>
      </Squish>

      <Glass style={styles.card}>
        <Micro style={{ marginBottom: 10 }}>Coureurs du quartier</Micro>
        {others.map(renderRival)}
      </Glass>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 18, paddingTop: 70, paddingBottom: 110 },
  title: { fontFamily: font.black, fontSize: 34, color: c.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: c.textMuted, fontFamily: font.bold, marginTop: 4, marginBottom: 16 },
  duelCard: { backgroundColor: 'rgba(124,92,255,0.10)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)', borderRadius: 20, padding: 16, marginBottom: 12 },
  duelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  duelTitle: { color: c.text, fontSize: 15, fontFamily: font.extrabold },
  duelStatus: { color: c.textMuted, fontSize: 12, fontFamily: font.black },
  duelTrack: { flexDirection: 'row', height: 12, borderRadius: 7, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  duelNumbers: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  duelKm: { fontSize: 13, fontFamily: font.extrabold },
  duelHint: { color: c.textMuted, fontSize: 11, fontFamily: font.bold },
  card: { padding: 16, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  emoji: { fontSize: 24 },
  pseudo: { fontSize: 15, fontFamily: font.extrabold, color: c.text },
  teamName: { fontSize: 12.5, fontFamily: font.bold },
  meta: { fontSize: 11.5, fontFamily: font.bold, color: c.textMuted, marginTop: 2 },
  challengeBtn: { backgroundColor: c.violet, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  challengeText: { color: '#FFFFFF', fontSize: 12.5, fontFamily: font.extrabold },
  inDuel: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  inDuelText: { color: c.textMuted, fontSize: 12, fontFamily: font.bold },
  invite: { backgroundColor: c.violet, borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginBottom: 14 },
  inviteText: { color: '#FFFFFF', fontSize: 14.5, fontFamily: font.extrabold },
  empty: { fontSize: 13, color: c.textMuted, fontFamily: font.bold, paddingVertical: 6 },
});
