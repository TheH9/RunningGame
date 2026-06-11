// Confidentialité & conditions — écran in-app (requis stores pour la
// localisation). Résume la collecte de données ; la politique complète est
// aussi hébergée (voir PRIVACY.md / URL store).

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { c, font } from '@/theme/tokens';

const PRIVACY_URL = 'https://bornes.app/confidentialite';
const TERMS_URL = 'https://bornes.app/cgu';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

export default function Legal() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.title}>Confidentialité</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <Section title="📍 Localisation">
        Bornes utilise ta position GPS <Text style={styles.b}>uniquement pendant un run</Text>, lorsque l'app est ouverte
        à l'écran. Elle sert à tracer ton parcours et à peindre ton territoire. Aucune localisation n'est collectée en
        arrière-plan.
      </Section>

      <Section title="🔒 Zone privée">
        Tu peux définir une Privacy Zone autour de chez toi : les passages à l'intérieur comptent pour tes stats mais ne
        sont <Text style={styles.b}>jamais affichés publiquement</Text> ni transmis.
      </Section>

      <Section title="🗂 Données stockées">
        Tes préférences, ta progression (XP, badges) et tes runs sont stockés <Text style={styles.b}>sur ton appareil</Text>.
        Si tu te connectes à un compte, tes runs et ton pseudo sont synchronisés pour les classements. Nous ne vendons
        aucune donnée et n'utilisons pas de traceurs publicitaires.
      </Section>

      <Section title="🧹 Tes droits">
        Tu peux supprimer l'intégralité de tes données à tout moment depuis Réglages → « Effacer toutes mes données ». La
        désinstallation de l'app efface également toutes les données locales.
      </Section>

      <Pressable style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} accessibilityRole="link">
        <Text style={styles.linkText}>Lire la politique de confidentialité complète →</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} accessibilityRole="link">
        <Text style={styles.linkText}>Conditions générales d'utilisation →</Text>
      </Pressable>

      <Text style={styles.foot}>Bornes v1.0 · contact : privacy@bornes.app</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { padding: 20, paddingTop: 64, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 28, fontFamily: font.black, color: c.text, letterSpacing: -0.8 },
  close: { fontSize: 18, color: c.textMuted, fontFamily: font.bold, padding: 4 },
  card: { backgroundColor: c.surface, borderRadius: 22, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTitle: { fontSize: 14, fontFamily: font.extrabold, color: c.text, marginBottom: 8 },
  text: { fontSize: 13.5, lineHeight: 21, color: c.textMuted, fontFamily: font.bold },
  b: { color: c.text, fontFamily: font.extrabold },
  link: { paddingVertical: 12 },
  linkText: { color: c.energy, fontSize: 14, fontFamily: font.extrabold },
  foot: { color: c.textDim, fontSize: 12, fontFamily: font.bold, marginTop: 14, textAlign: 'center' },
});
