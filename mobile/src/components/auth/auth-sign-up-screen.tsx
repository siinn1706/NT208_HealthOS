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
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { Checkbox } from '../primitives/input/checkbox';
import { ProgressBar } from '../primitives/progress-bar';
import { authService } from '../../api/services';
import { useTranslation } from 'react-i18next';
import { setPendingSignup } from '../../auth/pending-signup';
import { localizeError } from '../../api/error-message';

export function AuthSignUpScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8 && /\d/.test(password);
  const usernameValid = username.length === 0 || /^[a-z][a-z0-9_]{2,29}$/.test(username);

  function validate() {
    if (!name.trim()) return 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'A valid email is required.';
    if (!usernameValid) return i18n('auth.usernameInvalid');
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!agreed) return 'Please accept the terms to continue.';
    return null;
  }

  async function handleContinue() {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setLoading(true);
    setError(null);
    const finalUsername = username.trim() || normalizeUsername(email);
    try {
      await authService.requestOtp({
        email: email.trim(),
        purpose: 'signup',
        name: name.trim(),
        username: finalUsername,
        password,
      });
      setPendingSignup({ email: email.trim(), password, name: name.trim(), username: finalUsername });
      router.push({ pathname: '/auth/otp', params: { email: email.trim(), purpose: 'signup' } });
    } catch (err) {
      setError(localizeError(err instanceof Error ? err : null, i18n('api.genericError')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View>
      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <ProgressBar value={0.5} height={6} />
      </View>

      <Text style={[typography.title, { color: t.ink, marginTop: 20, marginBottom: 0 }]}>Create account</Text>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 4, marginBottom: 22 }]}>
        Takes under 2 minutes ·{' '}
        <Text style={{ color: t.ink2, fontFamily: 'Inter_600SemiBold' }}>Step 1 of 2</Text>
      </Text>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      <View style={styles.fieldGroup}>
        <Input label={i18n('auth.fullName')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Jane Doe" />
        <Input label={i18n('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" />
        <Input
          label={i18n('auth.usernameLabel')}
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase().trim())}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          placeholder={i18n('auth.usernamePlaceholder')}
          helper={i18n('auth.usernameHelper')}
          valid={username.length === 0 ? undefined : usernameValid}
        />
        <Input
          label={i18n('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Min 8 characters"
          helper="At least 8 characters with a number"
          valid={passwordValid}
        />
      </View>

      <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} accessibilityLabel="Agree to terms and privacy policy">
        <Checkbox value={agreed} onChange={setAgreed} />
        <Text style={[typography.caption, { color: t.ink3, flex: 1, marginLeft: 10 }]}>
          I agree to the{' '}
          <Text style={{ color: t.brand, fontFamily: 'Inter_600SemiBold' }}>Terms</Text>
          {' '}and acknowledge the{' '}
          <Text style={{ color: t.brand, fontFamily: 'Inter_600SemiBold' }}>Privacy &amp; Health Data Policy</Text>
        </Text>
      </TouchableOpacity>

      <Button label={i18n('common.continue')} size="lg" loading={loading} onPress={handleContinue} style={styles.mainBtn} />
    </View>
    </KeyboardAvoidingView>
  );
}

function normalizeUsername(value: string) {
  const base = value.split('@')[0] ?? value;
  const normalized = base.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+/, '');
  return (/^[a-z]/.test(normalized) ? normalized : `u_${normalized}`).slice(0, 30).padEnd(3, '0');
}

const styles = StyleSheet.create({
  progressWrap: { marginTop: 12, marginBottom: 0 },
  fieldGroup:   { gap: 12, marginBottom: 4 },
  checkRow:     { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, marginBottom: 4 },
  mainBtn:      { marginTop: 16 },
});
