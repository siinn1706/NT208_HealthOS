import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { User, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { useSession } from '../../auth/session-provider';
import { ApiError } from '../../api/client';
import { getPostAuthRoute } from '../../auth/auth-route-policy';
import { toCoreReachabilityMessage } from '../../api/core-reachability';
import { isInfrastructureErrorMessage } from '../../api/error-message';
import type { MobileOAuthProvider } from '../../api/services/auth-service';
import { HealthOSBrandMark } from '../brand/healthos-brand-mark';
import { GoogleMark } from '../../icons/oauth/google-mark';
import { GitHubMark } from '../../icons/oauth/github-mark';

function getLocalizedAuthErrorMessage(error: unknown, i18n: (key: string) => string) {
  if (!(error instanceof ApiError)) return null;

  const authErrorMap: Record<string, string> = {
    INVALID_CREDENTIALS: 'auth.invalidCredentials',
    ACCOUNT_LOCKED: 'auth.accountLocked',
    ACCOUNT_BANNED: 'auth.accountBanned',
    ACCOUNT_PENDING_DELETION: 'auth.accountPendingDeletion',
  };

  if (authErrorMap[error.code]) return i18n(authErrorMap[error.code]);

  if (error.status >= 500 || isInfrastructureErrorMessage(error.message)) {
    return i18n('api.error.internal_server_error');
  }

  if (error.code && error.code !== 'REQUEST_FAILED') {
    const apiKey = `api.error.${error.code.toLowerCase()}`;
    const localized = i18n(apiKey);
    if (localized !== apiKey) return localized;
  }

  return null;
}

function getAuthErrorMessage(error: unknown, i18n: (key: string) => string) {
  const localized = toCoreReachabilityMessage(error) ?? getLocalizedAuthErrorMessage(error, i18n);
  if (localized) return localized;
  if (error instanceof Error) {
    return isInfrastructureErrorMessage(error.message)
      ? i18n('api.error.internal_server_error')
      : error.message;
  }
  return i18n('auth.unableToSignIn');
}

export function AuthSignInScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const session = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<MobileOAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = identifier.trim().length > 0 && password.length >= 1;

  async function handleSignIn() {
    if (!isValid) { setError(i18n('auth.identifierPasswordRequired')); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await session.signIn(identifier.trim(), password);
      setPassword('');
      if (result.mfaRequired && result.challengeId) {
        router.push({
          pathname: '/auth/mfa' as never,
          params: {
            challenge_id: result.challengeId,
            expires_in_seconds: result.expiresInSeconds ? String(result.expiresInSeconds) : undefined,
          },
        } as never);
        return;
      }
      router.replace(getPostAuthRoute(result.user?.onboarding_status) as never);
    } catch (err) {
      setError(getAuthErrorMessage(err, i18n));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthSignIn(provider: MobileOAuthProvider) {
    setOauthLoading(provider);
    setError(null);
    try {
      const user = await session.signInWithOAuth(provider);
      router.replace(getPostAuthRoute(user.onboarding_status) as never);
    } catch (err) {
      setError(getAuthErrorMessage(err, i18n));
    } finally {
      setOauthLoading(null);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View>
      {/* Logo */}
      <View style={styles.logoRow}>
        <HealthOSBrandMark size={46} />
      </View>

      <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>{i18n('auth.welcomeBack')}</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>{i18n('auth.signInToContinue')}</Text>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      <View style={styles.fieldGroup}>
        <Input
          label={i18n('auth.loginIdentifier')}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          placeholder={i18n('auth.loginIdentifierPlaceholder')}
          leadingIcon={<User size={18} color={t.ink3} />}
          testID="auth-sign-in-email"
        />

        <Input
          label={i18n('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPw}
          autoComplete="password"
          textContentType="password"
          placeholder={i18n('auth.passwordPlaceholder')}
          leadingIcon={<Lock size={18} color={t.ink3} />}
          trailingText={showPw ? i18n('auth.hidePassword') : i18n('auth.showPassword')}
          onTrailingPress={() => setShowPw((v) => !v)}
          testID="auth-sign-in-password"
        />
      </View>

      <View style={styles.forgotRow}>
        <TouchableOpacity onPress={() => router.push('/auth/forgot' as never)} accessibilityRole="button" accessibilityLabel={i18n('auth.forgotPassword')}>
          <Text style={[typography.caption, { color: t.brand }]}>{i18n('auth.forgotPassword')}</Text>
        </TouchableOpacity>
      </View>

      <Button
        label={i18n('auth.signIn')}
        size="lg"
        loading={loading}
        onPress={handleSignIn}
        style={styles.mainBtn}
        testID="auth-sign-in-submit"
      />

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.divLine, { backgroundColor: t.border }]} />
        <Text style={[typography.caption, { color: t.ink4, marginHorizontal: 12, letterSpacing: 1.4, fontFamily: 'Inter_600SemiBold' }]}>
          {i18n('common.orContinueWith')}
        </Text>
        <View style={[styles.divLine, { backgroundColor: t.border }]} />
      </View>

      {/* OAuth row */}
      <View style={styles.oauthRow}>
        <TouchableOpacity
          style={[styles.oauthBtn, { borderColor: t.borderStrong, backgroundColor: t.card, opacity: oauthLoading ? 0.62 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={i18n('auth.continueWithGoogle')}
          disabled={Boolean(oauthLoading) || loading}
          onPress={() => handleOAuthSignIn('google')}
        >
          <GoogleMark size={20} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 8 }]}>
            {oauthLoading === 'google' ? i18n('common.working') : 'Google'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.oauthBtn, { borderColor: t.borderStrong, backgroundColor: t.card, opacity: oauthLoading ? 0.62 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={i18n('auth.continueWithGitHub')}
          disabled={Boolean(oauthLoading) || loading}
          onPress={() => handleOAuthSignIn('github')}
        >
          <GitHubMark size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 8 }]}>
            {oauthLoading === 'github' ? i18n('common.working') : 'GitHub'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/auth/sign-up')} accessibilityRole="button" accessibilityLabel={i18n('auth.createAccount')}>
        <Text style={[typography.caption, { color: t.ink3 }]}>{i18n('auth.newHere')}</Text>
        <Text style={[typography.caption, { color: t.brand, fontFamily: 'Inter_600SemiBold' }]}>{i18n('auth.createAccount')}</Text>
      </TouchableOpacity>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logoRow:    { alignItems: 'flex-start', marginBottom: 24 },
  fieldGroup: { gap: 14, marginBottom: 4 },
  forgotRow:  { alignItems: 'flex-end', marginBottom: 12 },
  mainBtn:    { marginTop: 4 },
  divider:    { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine:    { flex: 1, height: StyleSheet.hairlineWidth },
  oauthRow:   { flexDirection: 'row', gap: 12 },
  oauthBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1 },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
