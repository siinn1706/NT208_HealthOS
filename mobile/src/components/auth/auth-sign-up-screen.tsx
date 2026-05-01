import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/input/Input';
import { Checkbox } from '../primitives/input/Checkbox';
import { authService } from '../../api/services';

const PROGRESS = 0.5;

export function AuthSignUpScreen() {
  const t = useTheme();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (!name.trim()) return 'Full name is required.';
    if (!email.trim() || !email.includes('@')) return 'A valid email is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!agreed) return 'Please accept the terms to continue.';
    return null;
  }

  const isValid = validate() === null;

  async function handleContinue() {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.requestOtp({
        email: email.trim(),
        purpose: 'signup',
        name: name.trim(),
        username: normalizeUsername(username || email),
        password,
      });
      router.push({ pathname: '/auth/otp', params: { email: email.trim(), password, purpose: 'signup' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request OTP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: t.border }]}>
          <View style={[styles.progressFill, { backgroundColor: t.brand, width: `${PROGRESS * 100}%` }]} />
        </View>

        <Text style={[typography.title, { color: t.ink, marginTop: 20, marginBottom: 4 }]}>Create account</Text>
        <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>Join HealthOS to get started</Text>

        {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

        <View style={styles.fieldGroup}>
          <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Jane Doe" />
          <Input label="Username (optional)" value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="janedoe" />
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Min 8 characters" />
        </View>

        <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.7}>
          <Checkbox value={agreed} onChange={setAgreed} />
          <Text style={[typography.caption, { color: t.ink3, flex: 1, marginLeft: 10 }]}>
            I agree to the{' '}
            <Text style={{ color: t.brand }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: t.brand }}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <Button label="Continue" size="lg" loading={loading} onPress={handleContinue} style={styles.mainBtn} />

        <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/auth/sign-in')}>
          <Text style={[typography.caption, { color: t.ink3 }]}>Already have an account? </Text>
          <Text style={[typography.caption, { color: t.brand, fontFamily: 'Inter_600SemiBold' }]}>Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function normalizeUsername(value: string) {
  const base = value.split('@')[0] ?? value;
  const normalized = base.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+/, '');
  return (/^[a-z]/.test(normalized) ? normalized : `u_${normalized}`).slice(0, 30).padEnd(3, '0');
}

const styles = StyleSheet.create({
  flex:          { flex: 1 },
  scroll:        { paddingBottom: 40 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill:  { height: 4, borderRadius: 2 },
  fieldGroup:    { gap: 12, marginBottom: 4 },
  checkRow:      { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, marginBottom: 4 },
  mainBtn:       { marginTop: 16 },
  switchRow:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
