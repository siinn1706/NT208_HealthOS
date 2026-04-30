import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { authService } from '../../api/services';
import { useSession } from '../../auth/SessionProvider';

// ─── ForgotPasswordScreen ────────────────────────────────────────────────────

export function ForgotPasswordScreen({ t }: { t: ReturnType<typeof useTheme> }) {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset() {
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.requestOtp({ email: email.trim(), purpose: 'reset_password' });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request reset code.');
    } finally {
      setLoading(false);
    }
  }

  async function completeReset() {
    if (!email.trim() || !code.trim() || !newPassword) return;
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.verifyOtp({
        email: email.trim(),
        purpose: 'reset_password',
        code: code.trim(),
      });
      await authService.resetPassword(email.trim(), newPassword);
      await session.refreshUser();
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.iconBox, { backgroundColor: t.brandSoft }]}>
          <Text style={[styles.iconText, { color: t.brand }]}>✓</Text>
        </View>
        <Text style={[styles.heading, { color: t.ink }]}>Check your inbox</Text>
        <Text style={[styles.subheading, { color: t.ink3 }]}>
          We sent a password reset OTP to {email}. It expires shortly.
        </Text>
        {error && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}
        <TextInput
          style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
          placeholder="Reset OTP"
          placeholderTextColor={t.ink3}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        <TextInput
          style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
          placeholder="New password"
          placeholderTextColor={t.ink3}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.primary }, loading && styles.disabled]}
          onPress={completeReset}
          disabled={loading}
        >
          <Text style={[styles.btnLabel, { color: t.primaryInk }]}>{loading ? 'Resetting...' : 'Reset password'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Text style={[styles.heading, { color: t.ink }]}>Forgot password?</Text>
      <Text style={[styles.subheading, { color: t.ink3 }]}>
        Enter your email and we'll send a reset OTP
      </Text>
      {error && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Email"
        placeholderTextColor={t.ink3}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: t.primary }, loading && styles.disabled]}
        onPress={requestReset}
        disabled={loading}
      >
        <Text style={[styles.btnLabel, { color: t.primaryInk }]}>{loading ? 'Sending...' : 'Send reset OTP'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/auth/sign-in')}>
        <Text style={[styles.link, { color: t.primary }]}>Back to sign in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  iconBox:    { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconText:   { fontSize: 32, fontWeight: '700' },
  heading:    { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subheading: { fontSize: 15, marginBottom: 24, color: undefined },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  btnLabel: { fontSize: 16, fontWeight: '600' },
  link:     { fontSize: 14, textAlign: 'center', marginTop: 16 },
  error:    { fontSize: 13, marginBottom: 12 },
  disabled: { opacity: 0.55 },
});
