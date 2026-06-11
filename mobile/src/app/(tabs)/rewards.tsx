// Lots — défi sponsor (progression saison), Drop de la semaine, coffre → QR.

import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getBackend } from '@/backend/GameBackend';
import type { Drop, RewardItem, SponsorChallenge } from '@/backend/types';
import { Bar, Glass, Micro, Squish } from '@/components/ui';
import { clearQualifiedDrop, getQualifiedDrop } from '@/lib/runDirector';
import { useAppStore } from '@/store/useAppStore';
import { c, font } from '@/theme/tokens';

const FALLBACK: SponsorChallenge = { title: 'Défi du mois', partner: '', description: '', prize: '', emoji: '🎽', goalKm: 25, endsAt: Date.now() };

export default function Rewards() {
  const paintedKm = useAppStore((s) => s.seasonPaintedM) / 1000;
  const [challenge, setChallenge] = useState<SponsorChallenge>(FALLBACK);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [qualified, setQualified] = useState(false);
  const [chest, setChest] = useState<RewardItem[]>([]);
  const [claiming, setClaiming] = useState(false);

  const refresh = useCallback(() => {
    const b = getBackend();
    b.getChallenge().then(setChallenge).catch(() => {});
    b.getChest().then(setChest).catch(() => {});
    b.getActiveDrop().then(async (d) => {
      setDrop(d);
      if (d) setQualified((await getQualifiedDrop()) === d.id);
    }).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  const viewReward = useCallback((id: string) => router.push({ pathname: '/reward-qr', params: { id } }), []);

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
      <Text style={styles.title}>LOTS</Text>
      <Text style={styles.sub}>De vrais lots, dans tes rues</Text>

      {drop && (
        <View style={[styles.dropCard, qualified && styles.dropCardQualified]}>
          <Text style={{ fontSize: 28 }}>{drop.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.dropTitle}>{drop.title}</Text>
            <Text style={styles.dropSub}>
              {qualified ? 'Attrapé pendant ton run — réclame ton lot !' : `Passe dans le cercle doré en courant · J-${dropDaysLeft}`}
            </Text>
          </View>
          {qualified ? (
            <Squish style={[styles.dropCta, claiming && { opacity: 0.5 }]} disabled={claiming} onPress={claim}>
              <Text style={styles.dropCtaText}>Réclamer</Text>
            </Squish>
          ) : (
            <Text style={{ fontSize: 20 }}>🏃</Text>
          )}
        </View>
      )}

      <LinearGradient colors={['#1a1430', '#241634']} style={styles.hero}>
        <Micro style={{ color: c.gold, letterSpacing: 1 }}>DÉFI DE LA SAISON · SPONSORISÉ</Micro>
        <Text style={styles.heroTitle}>{challenge.title}</Text>
        <Text style={styles.heroDesc}>{challenge.description}</Text>
        <Bar progress={progress} color={goalReached ? c.green : c.violet} height={10} />
        <Text style={styles.progressText}>
          {goalReached ? '🎉 Objectif atteint — tu es dans le tirage !' : `${paintedKm.toFixed(1).replace('.', ',')} / ${challenge.goalKm} km peints`}
        </Text>
        <View style={styles.prizeBox}>
          <Text style={{ fontSize: 26 }}>{challenge.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prizeText}>{challenge.prize}</Text>
            <Text style={styles.prizePartner}>{challenge.partner}</Text>
          </View>
        </View>
      </LinearGradient>

      <Glass style={styles.card}>
        <Micro style={{ marginBottom: 10 }}>Mon coffre</Micro>
        {chest.map((item) => (
          <Squish key={item.id} style={styles.chestRow} onPress={() => viewReward(item.id)}>
            <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.chestTitle}>{item.title}</Text>
              <Text style={styles.chestPartner}>{item.partner}</Text>
            </View>
            <Text style={styles.chestQr}>QR ›</Text>
          </Squish>
        ))}
        {chest.length === 0 && (
          <Text style={styles.empty}>Pas encore de lot — attrape le Drop de la semaine ou termine le défi. Chaque lot devient un QR à montrer en boutique.</Text>
        )}
      </Glass>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 18, paddingTop: 70, paddingBottom: 110 },
  title: { fontFamily: font.black, fontSize: 34, color: c.text, letterSpacing: -1 },
  sub: { fontSize: 13, color: c.textMuted, fontFamily: font.bold, marginTop: 4, marginBottom: 16 },
  dropCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,210,60,0.08)', borderWidth: 1.5, borderColor: c.gold, borderRadius: 20, padding: 16, marginBottom: 16 },
  dropCardQualified: { backgroundColor: 'rgba(255,210,60,0.18)' },
  dropTitle: { fontSize: 15.5, fontFamily: font.extrabold, color: c.text },
  dropSub: { fontSize: 12, fontFamily: font.bold, color: c.gold, marginTop: 2, lineHeight: 17 },
  dropCta: { backgroundColor: c.gold, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 10 },
  dropCtaText: { color: '#0A0B0F', fontSize: 13, fontFamily: font.black },
  hero: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124,92,255,0.25)' },
  heroTitle: { color: c.text, fontFamily: font.black, fontSize: 23, letterSpacing: -0.5, marginTop: 8 },
  heroDesc: { color: c.textDim, fontFamily: font.bold, fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  progressText: { color: c.textDim, fontFamily: font.extrabold, fontSize: 11.5, marginTop: 8, marginBottom: 16 },
  prizeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 },
  prizeText: { color: c.text, fontSize: 14.5, fontFamily: font.extrabold },
  prizePartner: { color: c.textMuted, fontSize: 12, fontFamily: font.bold, marginTop: 2 },
  card: { padding: 16 },
  chestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  chestTitle: { fontSize: 14.5, fontFamily: font.extrabold, color: c.text },
  chestPartner: { fontSize: 12, fontFamily: font.bold, color: c.textMuted, marginTop: 1 },
  chestQr: { fontSize: 13, fontFamily: font.black, color: c.violet2 },
  empty: { fontSize: 13.5, lineHeight: 20, color: c.textMuted, fontFamily: font.bold },
});
