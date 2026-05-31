import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { authService } from '../../api/services';
import { useSession } from '../../auth/session-provider';

export function AuthForgotPasswordScreen() {
  const t = useTheme();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError('A valid email is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.requestOtp({ email: email.trim(), purpose: 'reset_password' });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset code.');
    } finally {
      setLoading(false);
    }
  }

  async function completeReset() {
    if (!email.trim() || !code.trim() || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.verifyOtp({ email: email.trim(), purpose: 'reset_password', code: code.trim() });
      await authService.resetPassword(email.trim(), newPassword);
      const nextUser = await session.refreshUser();
      if (!nextUser) {
        setError('Password was reset, but we could not load your account. Please sign in again.');
        router.replace('/auth/sign-in');
        return;
      }
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.infoCard, { backgroundColor: t.brandSoft, borderRadius: t.radius.lg }]}>
          <Text style={[typography.caption, { color: t.brand }]}>
            Reset code sent to {email}. Check your inbox.
          </Text>
        </View>
        {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}
        <Input label="OTP code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="000000" />
        <Input label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Min 8 characters" />
        <Button label="Reset password" size="lg" loading={loading} onPress={completeReset} style={{ marginTop: 8 }} />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>Forgot password?</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>
        Enter the email linked to your HealthOS account and we'll send a reset link.
      </Text>

      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: t.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.border, padding: 14, marginBottom: 20 }]}>
        <Shield size={14} color={t.ink3} style={{ marginRight: 6 }} />
        <Text style={[typography.caption, { color: t.ink3, flex: 1 }]}>
          For your security, reset links expire after 15 minutes. Contact{' '}
          <Text style={{ fontFamily: 'Inter_600SemiBold' }}>support@healthos.app</Text>
          {' '}if you can't access your email.
        </Text>
      </View>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="you@example.com"
      />

      <Button label="Send reset link" size="lg" loading={loading} onPress={requestReset} style={{ marginTop: 8 }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start' },
});
