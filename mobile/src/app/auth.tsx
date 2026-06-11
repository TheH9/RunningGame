// Connexion / inscription — compte obligatoire avant de jouer.
// Apple (iOS natif) + Google (OAuth) + Email (code à 6 chiffres).

import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { MapView } from '@/components/map/MapView';
import { Squish } from '@/components/ui';
import {
  appleAuthAvailable, sendEmailOtp, signInWithApple, signInWithGoogle, verifyEmailOtp,
} from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { c, font, VIOLET } from '@/theme/tokens';

type Mode = 'choose' | 'email' | 'code';

export default function Auth() {
  const session = useAuthStore((s) => s.session);
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Dès qu'une session existe (Apple/Google/Email ou retour de deep-link), on entre.
  useEffect(() => {
    if (session) router.replace('/');
  }, [session]);

  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      setErr(e?.message ?? 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  };

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <View style={styles.root}>
      <View style={styles.fill}>
        <MapView dark interactive={false} initialScale={0.85} />
      </View>
      <View style={styles.scrim} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <Animated.Text entering={FadeIn.duration(600)} style={styles.logo}>BORNES</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(120).springify().damping(16)} style={styles.title}>
          {mode === 'choose' ? 'CRÉE TON\nCOMPTE' : mode === 'email' ? 'TON\nEMAIL' : 'TON\nCODE'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(240).springify().damping(16)} style={styles.sub}>
          {mode === 'choose'
            ? 'Un compte pour sauvegarder ta progression et te retrouver sur tous tes appareils.'
            : mode === 'email'
              ? 'On t’envoie un code à 6 chiffres pour te connecter.'
              : `Entre le code reçu à ${email.trim()}.`}
        </Animated.Text>

        {err && <Text style={styles.err}>{err}</Text>}

        <Animated.View entering={FadeInDown.delay(360).springify().damping(16)} style={{ alignSelf: 'stretch', gap: 12 }}>
          {mode === 'choose' && (
            <>
              {appleAuthAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={16}
                  style={styles.apple}
                  onPress={() => run(signInWithApple)}
                />
              )}
              <Squish style={[styles.btn, styles.google]} disabled={busy} onPress={() => run(signInWithGoogle)}>
                <Text style={styles.googleText}>Continuer avec Google</Text>
              </Squish>
              <Squish style={[styles.btn, styles.email]} disabled={busy} onPress={() => setMode('email')}>
                <Text style={styles.emailText}>Continuer avec un email</Text>
              </Squish>
            </>
          )}

          {mode === 'email' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="prénom@email.com"
                placeholderTextColor={c.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                inputMode="email"
                autoFocus
              />
              <Squish style={[styles.btn, styles.cta, !emailValid && { opacity: 0.4 }]} disabled={!emailValid || busy} onPress={() => run(async () => { await sendEmailOtp(email); setMode('code'); })}>
                <Text style={styles.ctaText}>Recevoir mon code</Text>
              </Squish>
              <Squish style={styles.back} onPress={() => setMode('choose')}>
                <Text style={styles.backText}>‹ Autres méthodes</Text>
              </Squish>
            </>
          )}

          {mode === 'code' && (
            <>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="••••••"
                placeholderTextColor={c.textMuted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />
              <Squish style={[styles.btn, styles.cta, code.trim().length < 6 && { opacity: 0.4 }]} disabled={code.trim().length < 6 || busy} onPress={() => run(() => verifyEmailOtp(email, code))}>
                <Text style={styles.ctaText}>Se connecter</Text>
              </Squish>
              <Squish style={styles.back} onPress={() => run(() => sendEmailOtp(email))}>
                <Text style={styles.backText}>Renvoyer le code</Text>
              </Squish>
            </>
          )}
        </Animated.View>

        {busy && <ActivityIndicator color={VIOLET} style={{ marginTop: 18 }} />}
        <Text style={styles.legal}>En continuant, tu acceptes nos conditions et notre politique de confidentialité.</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,9,13,0.66)' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 28, paddingBottom: 46 },
  logo: { color: VIOLET, fontFamily: font.black, fontSize: 15, letterSpacing: 7, marginBottom: 14 },
  title: { color: c.text, fontFamily: font.black, fontSize: 40, lineHeight: 44, letterSpacing: -1.5 },
  sub: { color: c.textDim, fontFamily: font.bold, fontSize: 14.5, lineHeight: 21, marginTop: 14, marginBottom: 22 },
  err: { color: c.red, fontFamily: font.bold, fontSize: 13, marginBottom: 12 },
  apple: { height: 54, alignSelf: 'stretch' },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  google: { backgroundColor: '#FFFFFF' },
  googleText: { color: '#0A0B0F', fontSize: 15.5, fontFamily: font.extrabold },
  email: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  emailText: { color: c.text, fontSize: 15.5, fontFamily: font.extrabold },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1,
    borderRadius: 16, color: c.text, fontSize: 16, fontFamily: font.bold, paddingHorizontal: 18, paddingVertical: 15,
  },
  codeInput: { textAlign: 'center', letterSpacing: 10, fontSize: 24, fontFamily: font.black },
  cta: { backgroundColor: VIOLET },
  ctaText: { color: '#0A0B0F', fontSize: 16, fontFamily: font.extrabold },
  back: { alignItems: 'center', paddingVertical: 10 },
  backText: { color: c.textMuted, fontSize: 13.5, fontFamily: font.bold },
  legal: { color: c.textMuted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 18 },
});
