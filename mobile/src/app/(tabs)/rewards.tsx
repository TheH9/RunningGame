// Récompenses — défi sponsor (progression réelle, bornée à la saison),
// Drop de la semaine (qualification en courant), coffre → QR en boutique.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getBackend } from '@/backend/GameBackend';
import type { Drop, RewardItem, SponsorChallenge } from '@/backend/types';
import { clearQualifiedDrop, getQualifiedDrop } from '@/lib/runDirector';
import { useAppStore } from '@/store/useAppStore';
import { light } from '@/theme/tokens';

const FALLBACK: SponsorChallenge = {
  title: 'Défi du mois', partner: '', description: '', prize: '', emoji: '🎽',
  goalKm: 25, endsAt: Date.now(),
};

export default function Rewards() {
  const paintedKm = useAppStore((s) => s.seasonPaintedM) / 1000;
  const [challenge, setChallenge] = useState<SponsorChallenge>(FALLBACK);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [qualified, setQualified] = useState(false);
  const [chest, setChest] = useState<RewardItem[]>([]);
  const [claiming, setClaiming] = useState(false);

  const refresh = useCallback(() => {
    const backend = getBackend();
    backend.getChallenge().then(setChallenge).catch(() => {});
    backend.getChest().then(setChest).catch(() => {});
    backend
      .getActiveDrop()
      .then(async (d) => {
        setDrop(d);
        if (d) setQualified((await getQualifiedDrop()) === d.id);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const claim = async () => {
    if (!drop) return;
    setClaiming(true);
    try {
      const item = await getBackend().claimDrop(drop.id);
      await clearQualifiedDrop();
      refresh();
      router.push({ pathname: '/reward-qr', params: { id: item.id } });
    } finally {
      setClaiming(false);
    }
  };

  const progress = Math.min(1, paintedKm / challenge.goalKm);
  const goalReached = progress >= 1;
  const dropDaysLeft = drop ? Math.max(0, Math.ceil((drop.endsAt - Date.now()) / (24 * 3600 * 1000))) : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Récompenses</Text>
      <Text style={styles.sub}>De vrais lots, dans tes rues</Text>

      {/* Drop de la semaine */}
      {drop && (
        <View style={[styles.dropCard, qualified && styles.dropCardQualified]}>
          <Text style={styles.dropEmoji}>{drop.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.dropTitle}>{drop.title}</Text>
            <Text style={styles.dropSub}>
              {qualified
                ? 'Attrapé pendant ton run — réclame ton lot !'
                : `Passe dans le cercle doré sur la carte en courant · J-${dropDaysLeft}`}
            </Text>
          </View>
          {qualified ? (
            <Pressable style={[styles.dropCta, claiming && { opacity: 0.5 }]} disabled={claiming} onPress={claim}>
              <Text style={styles.dropCtaText}>Réclamer</Text>
            </Pressable>
          ) : (
            <Text style={styles.dropBadge}>🏃</Text>
          )}
        </View>
      )}

      {/* Défi sponsorisé */}
      <View style={styles.hero}>
        <Text style={styles.heroTag}>DÉFI DE LA SAISON · SPONSORISÉ</Text>
        <Text style={styles.heroTitle}>{challenge.title}</Text>
        <Text style={styles.heroDesc}>{challenge.description}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }, goalReached && { backgroundColor: '#2EB789' }]} />
        </View>
        <Text style={styles.progressText}>
          {goalReached
            ? '🎉 Objectif atteint — tu es dans le tirage !'
            : `${paintedKm.toFixed(1).replace('.', ',')} / ${challenge.goalKm} km peints · fin le ${new Date(challenge.endsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
        </Text>
        <View style={styles.prizeBox}>
          <Text style={styles.prizeEmoji}>{challenge.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prizeText}>{challenge.prize}</Text>
            <Text style={styles.prizePartner}>{challenge.partner}</Text>
          </View>
        </View>
      </View>

      {/* Coffre */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mon coffre</Text>
        {chest.map((item) => (
          <Pressable
            key={item.id}
            style={styles.chestRow}
            onPress={() => router.push({ pathname: '/reward-qr', params: { id: item.id } })}>
            <Text style={styles.chestEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.chestTitle}>{item.title}</Text>
              <Text style={styles.chestPartner}>{item.partner}</Text>
            </View>
            <Text style={styles.chestQr}>QR ›</Text>
          </Pressable>
        ))}
        {chest.length === 0 && (
          <Text style={styles.empty}>
            Pas encore de lot — attrape le Drop de la semaine ou termine le défi de la saison. Chaque lot gagné devient
            un QR code à montrer en boutique.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 20, paddingTop: 76, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: light.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: light.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 20 },
  dropCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7E2',
    borderWidth: 1.5,
    borderColor: '#F5B82E',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  dropCardQualified: { backgroundColor: '#F5B82E', borderColor: '#F5B82E' },
  dropEmoji: { fontSize: 28 },
  dropTitle: { fontSize: 15.5, fontWeight: '800', color: '#1C1E24' },
  dropSub: { fontSize: 12, fontWeight: '600', color: '#6B6248', marginTop: 2, lineHeight: 17 },
  dropCta: { backgroundColor: '#1C1E24', borderRadius: 13, paddingHorizontal: 15, paddingVertical: 10 },
  dropCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  dropBadge: { fontSize: 20 },
  hero: { backgroundColor: '#1C1E24', borderRadius: 24, padding: 20, marginBottom: 16 },
  heroTag: { color: '#F5B82E', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  progressTrack: { height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#3B82F6' },
  progressText: { color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: '700', marginTop: 8, marginBottom: 16 },
  prizeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 },
  prizeEmoji: { fontSize: 26 },
  prizeText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  prizePartner: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: light.surface, borderRadius: 22, padding: 18 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  chestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(31,41,55,0.05)' },
  chestEmoji: { fontSize: 24 },
  chestTitle: { fontSize: 14.5, fontWeight: '800', color: light.text },
  chestPartner: { fontSize: 12, fontWeight: '600', color: light.textMuted, marginTop: 1 },
  chestQr: { fontSize: 13, fontWeight: '800', color: '#3B82F6' },
  empty: { fontSize: 13.5, lineHeight: 20, color: light.textMuted, fontWeight: '600' },
});
