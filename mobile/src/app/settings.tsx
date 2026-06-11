// Réglages — Privacy Zone (RGPD), gestion des données, à-propos.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { confirm } from '@/lib/confirm';
import { DEFAULT_ANCHOR } from '@/lib/world';
import { useAppStore } from '@/store/useAppStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { useTerritoryStore } from '@/store/useTerritoryStore';
import { light } from '@/theme/tokens';

const RADII = [200, 400, 600] as const;

export default function Settings() {
  const privacyZone = useAppStore((s) => s.privacyZone);
  const setPrivacyZone = useAppStore((s) => s.setPrivacyZone);
  const worldAnchor = useAppStore((s) => s.worldAnchor);
  const [busy, setBusy] = useState(false);

  const defineZone = async (radiusM: number) => {
    setBusy(true);
    try {
      // 1 fix GPS si possible, sinon l'ancrage du monde (web / refus)
      let center = worldAnchor ?? DEFAULT_ANCHOR;
      try {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          center = { lat: fix.coords.latitude, lon: fix.coords.longitude };
        }
      } catch {
        // web / refusé → ancrage existant
      }
      setPrivacyZone({ center, radiusM });
    } finally {
      setBusy(false);
    }
  };

  const deleteAllData = () => {
    confirm(
      'Effacer toutes mes données ?',
      'Profil, progression, runs et préférences seront définitivement supprimés de cet appareil. Cette action est irréversible.',
      'Tout effacer',
      () => {
        confirm('Vraiment sûr ?', 'Dernière confirmation.', 'Oui, tout supprimer', async () => {
          await AsyncStorage.clear();
          useAppStore.getState().resetAll();
          useSeasonStore.setState({ current: null, hallOfFame: [], pendingRecap: null });
          await useTerritoryStore.getState().resetForSeason();
          router.replace('/onboarding');
        });
      },
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.title}>Réglages</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Privacy Zone</Text>
        <Text style={styles.text}>
          Tes passages autour de chez toi comptent pour tes stats mais ne sont <Text style={{ fontWeight: '800' }}>jamais affichés</Text> sur
          la carte publique.
        </Text>
        <View style={styles.radiusRow}>
          {RADII.map((r) => (
            <Pressable
              key={r}
              style={[styles.radius, privacyZone?.radiusM === r && styles.radiusActive, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => defineZone(r)}>
              <Text style={[styles.radiusText, privacyZone?.radiusM === r && { color: '#FFFFFF' }]}>{r} m</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>
          {privacyZone
            ? `Zone active : ${privacyZone.radiusM} m autour de ta position enregistrée.`
            : 'Choisis un rayon — il sera centré sur ta position actuelle.'}
        </Text>
        {privacyZone && (
          <Pressable onPress={() => setPrivacyZone(null)}>
            <Text style={styles.remove}>Supprimer la zone</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛡️ Confidentialité & données</Text>
        <Text style={styles.text}>
          Ta position n'est utilisée qu'app ouverte : pendant un run et pour centrer la carte sur ta ville. Tes données
          restent sur ton appareil.
        </Text>
        <Pressable style={styles.linkBtn} onPress={() => router.push('/legal')} accessibilityRole="button">
          <Text style={styles.linkText}>Voir la politique de confidentialité →</Text>
        </Pressable>
        <Pressable style={styles.danger} onPress={deleteAllData} accessibilityRole="button">
          <Text style={styles.dangerText}>Effacer toutes mes données</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ À propos</Text>
        <Text style={styles.text}>
          Bornes v1.0 — cours, peins ta ville, défends-la.{'\n'}Mécanique « Trail Paint » : ta trace GPS rejoint le
          territoire de ton équipe ; de loin, la ville devient un plateau d'hexagones. La carte est remise à zéro à
          chaque saison (6 semaines).
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  scroll: { padding: 20, paddingTop: 64, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', color: light.text, letterSpacing: -0.8 },
  close: { fontSize: 18, color: light.textMuted, fontWeight: '700', padding: 4 },
  card: { backgroundColor: light.surface, borderRadius: 22, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: light.text, marginBottom: 8 },
  text: { fontSize: 13.5, lineHeight: 20, color: light.textMuted, fontWeight: '600' },
  radiusRow: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 10 },
  radius: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(31,41,55,0.12)', paddingVertical: 12, alignItems: 'center' },
  radiusActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  radiusText: { fontSize: 14, fontWeight: '800', color: light.text },
  hint: { fontSize: 12, fontWeight: '600', color: light.textMuted, lineHeight: 17 },
  remove: { fontSize: 13, fontWeight: '800', color: '#FF4D5E', marginTop: 10 },
  danger: { backgroundColor: 'rgba(255,77,94,0.08)', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  dangerText: { color: '#FF4D5E', fontSize: 14, fontWeight: '800' },
  linkBtn: { paddingVertical: 12, marginTop: 4 },
  linkText: { color: '#B8FF2E', fontSize: 14, fontWeight: '800' },
});
