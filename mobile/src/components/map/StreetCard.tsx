// StreetCard — tap sur une rue/zone : qui la tient, depuis quand, force.
// Dark glass néon, CTA reprendre/renforcer.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Squish } from '../ui';
import { useAppStore } from '../../store/useAppStore';
import { c, font, glow, TEAMS } from '../../theme/tokens';
import type { InspectInfo } from './MapView';

type Props = { info: InspectInfo; onClose: () => void; onChallenge: () => void };

function holdLabel(ms: number): string {
  const days = Math.floor(ms / (24 * 3600 * 1000));
  if (days >= 1) return `tenue depuis ${days} j${days >= 7 ? ' 🔥' : ''}`;
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `tenue depuis ${hours} h`;
  return 'peinte à l’instant ⚡';
}

export function StreetCard({ info, onClose, onChallenge }: Props) {
  const myTeam = useAppStore((s) => s.team) ?? 'vagues';
  const owner = info.cell.owner ?? info.trail?.team ?? null;
  if (!owner) return null;
  const t = TEAMS[owner];
  const pseudo = info.cell.ownerPseudo ?? info.trail?.runnerPseudo ?? 'Inconnu';
  const isMine = owner === myTeam;
  const strengthPct = Math.round(info.cell.strength * 100);

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutDown} style={styles.wrap}>
      <View style={[styles.card, glow(t.glow, 26, 0.3)]}>
        <View style={styles.glassHi} pointerEvents="none" />
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: t.color }]}>
            <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.street}>{info.streetName}</Text>
            <Text style={styles.owner}>
              {isMine ? 'À ton équipe' : `Tenue par ${pseudo}`} · <Text style={{ color: t.color }}>{t.name}</Text>
            </Text>
          </View>
          <Squish onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </Squish>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{holdLabel(info.cell.heldSinceMs)}</Text>
            <Text style={styles.statLabel}>Possession</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.gauge}>
              <View style={[styles.gaugeFill, { width: `${Math.max(8, strengthPct)}%`, backgroundColor: t.color }]} />
            </View>
            <Text style={styles.statLabel}>
              Contrôle {strengthPct}%{info.cell.contested ? ' · CONTESTÉE ⚔️' : ''}{info.cell.fading ? ' · pâlit' : ''}
            </Text>
          </View>
        </View>

        <Squish style={[styles.cta, { backgroundColor: isMine ? 'rgba(255,255,255,0.08)' : TEAMS[myTeam].color }]} onPress={onChallenge}>
          <Text style={styles.ctaText}>{isMine ? '💪 Renforcer cette rue' : '⚔️ Reprendre cette rue'}</Text>
        </Squish>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, bottom: 150 },
  card: { backgroundColor: 'rgba(18,20,28,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 24, padding: 16, overflow: 'hidden' },
  glassHi: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  street: { fontSize: 17, fontFamily: font.extrabold, color: c.text, letterSpacing: -0.3 },
  owner: { fontSize: 12.5, fontFamily: font.bold, color: c.textMuted, marginTop: 2 },
  close: { fontSize: 16, color: c.textMuted, fontFamily: font.bold, padding: 4 },
  statsRow: { flexDirection: 'row', gap: 14, marginTop: 14, marginBottom: 14 },
  stat: { flex: 1 },
  statValue: { fontSize: 13.5, fontFamily: font.extrabold, color: c.text },
  statLabel: { fontSize: 10, fontFamily: font.extrabold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  gauge: { height: 8, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 5 },
  cta: { borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 14.5, fontFamily: font.extrabold },
});
