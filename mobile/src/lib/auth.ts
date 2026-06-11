// Authentification — comptes obligatoires (Apple, Google, Email OTP).
// Apple : natif (expo-apple-authentication) → signInWithIdToken.
// Google : OAuth web (signInWithOAuth + navigateur), échange du code PKCE.
// Email : code à 6 chiffres (signInWithOtp / verifyOtp) — reste dans l'app.

import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Sign in with Apple : dispo seulement sur iOS. */
export const appleAuthAvailable = Platform.OS === 'ios';

export async function signInWithApple(): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!cred.identityToken) throw new Error('Apple : jeton d’identité manquant');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: cred.identityToken,
  });
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const redirectTo = makeRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Google : URL d’autorisation manquante');

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return; // annulé par l'utilisateur

  // PKCE : la redirection renvoie ?code=… qu'on échange contre une session.
  const code = Linking.parse(res.url).queryParams?.code;
  if (typeof code === 'string') {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) throw exErr;
  }
}

/** Envoie un code à 6 chiffres par email (crée le compte si besoin). */
export async function sendEmailOtp(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Vérifie le code reçu par email → ouvre la session. */
export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}
