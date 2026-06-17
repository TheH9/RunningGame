// Profil — carte de joueur : header gradient, titre, XP, badges, rangs.

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Bar, Glass, Micro, Pop, Squish, Ticker } from '@/components/ui';
import { avatarFromSeed } from '@/lib/avatar';
import { discoveryPercent } from '@/lib/territory';
import { levelFromXp, useGameStore } from '@/store/useGameStore';
import { useAppStore } from '@/store/useAppStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { c, font, TEAMS } from '@/theme/tokens';

const CITY_CELLS = 12000;

export default function Profile() {
  // Sélecteurs étroits : chaque champ s'abonne séparément, l'écran ne re-rend
  // que si une valeur qu'il affiche change (pas à chaque mutation du store).
  const pseudo = useAppStore((s) => s.pseudo);
  const team = useAppStore((s) => s.team);
  const totalRuns = useAppStore((s) => s.totalRuns);
  const totalDistanceM = useAppStore((s) => s.totalDistanceM);
  const totalPaintedM = useAppStore((s) => s.totalPaintedM);
  const discoveredCells = useAppStore((s) => s.discoveredCells);
  const bestRun = useAppStore((s) => s.bestRun);
  const avatar = useAppStore((s) => s.avatar);
  const avatarCfg = useMemo(() => avatar ?? avatarFromSeed(pseudo ?? 'moi'), [avatar, pseudo]);
  const xp = useGameStore((s) => s.xp);
  const streak = useGameStore((s) => s.streak);
  const badges = useGameStore((s) => s.getBadges)();
  const hallOfFame = useSeasonStore((s) => s.hallOfFame);
  const lvl = levelFromXp(xp);
  const t = team ? TEAMS[team] : TEAMS.vagues;
  // new Set(...) sur potentiellement des milliers de cellules : à ne refaire que
  // quand la liste change, pas à chaque rendu.
  const discovered = useMemo(
    () => discoveryPercent(new Set(discoveredCells), CITY_CELLS),
    [discoveredCells],
  );
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* Header carte de joueur */}
      <LinearGradient colors={[t.color, '#1A2030', '#0E1424']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.head}>
        <View style={styles.headRing} pointerEvents="none" />
        <View style={styles.titleBadge}>
          <Text style={{ fontSize: 13 }}>👑</Text>
          <Text style={styles.titleBadgeText}>NIV {lvl.level}</Text>
        </View>
        <Squish style={styles.avatar} onPress={() => router.push('/avatar')}>
          <Avatar config={avatarCfg} team={team} size={68} ring />
          <View style={styles.avatarEdit}>
            <Text style={{ fontSize: 12 }}>✏️</Text>
          </View>
        </Squish>
        <Text style={styles.pseudo}>{(pseudo ?? 'Coureur').toUpperCase()}</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {t.emoji} {t.name} · 🔥 {streak} j
          </Text>
        </View>
        <View style={{ marginTop: 14 }}>
          <Bar progress={lvl.progress} color="#FFFFFF" track="rgba(0,0,0,0.25)" height={8} glowOn={false} />
          <Text style={styles.xpText}>
            {lvl.into} / {lvl.span} XP · niveau {lvl.level + 1}
          </Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatTile value={totalDistanceM / 1000} unit="km" label="Courus" />
        <StatTile value={totalPaintedM / 1000} unit="km" label="Peints" accent />
        <StatTile value={totalRuns} unit="" label="Runs" decimals={0} />
      </View>

      <Micro style={styles.sectit}>Badges · {unlocked}/{badges.length}</Micro>
      <View style={styles.badges}>
        {badges.slice(0, 8).map((b, i) => (
          <Pop key={b.id} delay={i * 60} style={styles.badgeWrap}>
            <Squish style={[styles.badge, !b.unlocked && styles.badgeLock, b.id === 'champion' && b.unlocked && styles.badgeGold]} onPress={() => router.push({ pathname: '/badge', params: { id: b.id } })}>
              <Text style={{ fontSize: 26 }}>{b.unlocked ? b.emoji : '🔒'}</Text>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </Squish>
          </Pop>
        ))}
      </View>

      <Micro style={styles.sectit}>Cette saison</Micro>
      <View style={styles.statsRow}>
        <MiniTile value={`${discovered}%`} label="Ville explorée" />
        <MiniTile
          value={bestRun ? `${Math.floor(bestRun.paceMinKm)}:${String(Math.round((bestRun.paceMinKm % 1) * 60)).padStart(2, '0')}` : '–'}
          label="Record /km"
        />
        <MiniTile value={`${hallOfFame.length}`} label="Saisons jouées" />
      </View>

      {hallOfFame.length > 0 && (
        <Glass style={styles.hof}>
          <Micro style={{ marginBottom: 10 }}>🏛 Hall of Fame</Micro>
          {hallOfFame.map((r) => (
            <Text key={r.season.number} style={styles.hofLine}>
              S{r.season.number} — {TEAMS[r.podium[0]?.team ?? 'vagues'].emoji} {TEAMS[r.podium[0]?.team ?? 'vagues'].name} ·
              toi #{r.me.rank}
            </Text>
          ))}
        </Glass>
      )}

      <Squish style={styles.settings} onPress={() => router.push('/settings')}>
        <Text style={styles.settingsText}>⚙️ Réglages · Privacy Zone · Mes données</Text>
      </Squish>
    </ScrollView>
  );
}

function StatTile({ value, unit, label, accent, decimals = 1 }: { value: number; unit: string; label: string; accent?: boolean; decimals?: number }) {
  return (
    <Glass style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Ticker value={value} decimals={decimals} style={[styles.statValue, accent && { color: c.violet2 }]} />
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
      <Micro style={{ marginTop: 2 }}>{label}</Micro>
    </Glass>
  );
}

function MiniTile({ value, label }: { value: string; label: string }) {
  return (
    <Glass style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Micro style={{ marginTop: 2 }}>{label}</Micro>
    </Glass>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 18, paddingTop: 64, paddingBottom: 110 },
  head: { borderRadius: 30, padding: 22, overflow: 'hidden' },
  headRing: { position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, borderWidth: 24, borderColor: 'rgba(255,255,255,0.1)' },
  titleBadge: { position: 'absolute', right: 18, top: 20, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6 },
  titleBadgeText: { color: '#FFFFFF', fontFamily: font.black, fontSize: 11 },
  avatar: { width: 68, height: 68 },
  avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#0E1424', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  pseudo: { color: '#FFFFFF', fontFamily: font.black, fontSize: 26, marginTop: 12, letterSpacing: -0.5 },
  tag: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, marginTop: 8 },
  tagText: { color: '#FFFFFF', fontFamily: font.extrabold, fontSize: 11 },
  xpText: { color: 'rgba(255,255,255,0.85)', fontFamily: font.bold, fontSize: 10.5, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 11, marginTop: 14 },
  stat: { flex: 1, padding: 15 },
  statValue: { color: c.text, fontFamily: font.black, fontSize: 24, letterSpacing: -1 },
  statUnit: { color: c.textMuted, fontFamily: font.bold, fontSize: 12, marginLeft: 2 },
  sectit: { letterSpacing: 1.5, marginTop: 22, marginBottom: 12, marginLeft: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeWrap: { width: '22.5%' },
  badge: { aspectRatio: 1, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  badgeLock: { opacity: 0.4 },
  badgeGold: { borderColor: 'rgba(255,210,60,0.5)', shadowColor: c.gold, shadowOpacity: 0.3, shadowRadius: 16 },
  badgeLabel: { fontSize: 8, fontFamily: font.extrabold, color: c.textDim, textAlign: 'center', paddingHorizontal: 2 },
  hof: { padding: 16, marginTop: 18 },
  hofLine: { color: c.textDim, fontFamily: font.bold, fontSize: 12.5, marginBottom: 5 },
  settings: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  settingsText: { fontFamily: font.extrabold, fontSize: 13, color: c.textDim },
});
