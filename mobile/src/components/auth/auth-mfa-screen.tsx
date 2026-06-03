import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../auth/session-provider';

export function AuthMfaScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const session = useSession();
  const params = useLocalSearchParams<{ challenge_id?: string; expires_in_seconds?: string }>();
  const challengeId = typeof params.challenge_id === 'string' ? params.challenge_id : '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!challengeId) {
      setError('MFA challenge is missing. Please sign in again.');
      return;
    }
    if (!code.trim()) {
      setError('Enter your authenticator or recovery code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await session.completeMfaSignIn(challengeId, code.trim());
      // AuthGate owns post-auth navigation after the session user is refreshed.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify MFA code.');
    } finally {
      setLoading(false);
    }
  }

  if (!challengeId) {
    return (
      <View style={styles.center}>
        <Text style={[typography.bodyMed, { color: t.danger }]}>MFA challenge is missing.</Text>
        <Button label={i18n('auth.backToSignIn')} onPress={() => router.replace('/auth/sign-in')} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.iconTile, { backgroundColor: t.brandSoft }]}>
        <ShieldCheck size={26} color={t.brand} />
      </View>
      <Text style={[typography.title, { color: t.ink, marginBottom: 6 }]}>Multi-factor authentication</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 20 }]}>
        Enter your 6-digit authenticator code or a recovery code to finish signing in.
      </Text>
      {error ? <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text> : null}
      <Input
        label={i18n('auth.verificationCode')}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        placeholder="123456 or recovery code"
      />
      <Button label={i18n('auth.verifyAndContinue')} size="lg" loading={loading} onPress={handleVerify} style={{ marginTop: 14 }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, padding: 16 },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});
