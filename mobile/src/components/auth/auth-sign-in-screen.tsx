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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/input/Input';
import { authService } from '../../api/services';
import { useSession } from '../../auth/SessionProvider';
import { GoogleMark } from '../../icons/oauth/GoogleMark';
import { AppleMark } from '../../icons/oauth/AppleMark';

export function AuthSignInScreen() {
  const t = useTheme();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.length >= 1;

  async function handleSignIn() {
    if (!isValid) { setError('Email and password are required.'); return; }
    setLoading(true);
    setError(null);
    try {
      await session.signIn(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <LinearGradient colors={[t.brand, t.brandDeep]} style={styles.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={[typography.h3, { color: '#FFF', fontFamily: 'Inter_800ExtraBold' }]}>H</Text>
          </LinearGradient>
        </View>

        <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>Welcome back</Text>
        <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>Sign in to your HealthOS account</Text>

        {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

        <View style={styles.fieldGroup}>
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

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoComplete="password"
            textContentType="password"
            placeholder="••••••••"
            trailingIcon={
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                {showPw ? <EyeOff size={18} color={t.ink3} /> : <Eye size={18} color={t.ink3} />}
              </TouchableOpacity>
            }
          />
        </View>

        <View style={styles.forgotRow}>
          <TouchableOpacity onPress={() => router.push('/auth/forgot' as never)}>
            <Text style={[typography.caption, { color: t.brand }]}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <Button label="Sign in" size="lg" loading={loading} onPress={handleSignIn} style={styles.mainBtn} />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.divLine, { backgroundColor: t.border }]} />
          <Text style={[typography.caption, { color: t.ink4, marginHorizontal: 12 }]}>or continue with</Text>
          <View style={[styles.divLine, { backgroundColor: t.border }]} />
        </View>

        {/* OAuth row */}
        <View style={styles.oauthRow}>
          <TouchableOpacity style={[styles.oauthBtn, { borderColor: t.border, backgroundColor: t.card }]}>
            <GoogleMark size={20} />
            <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 8 }]}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.oauthBtn, { borderColor: t.border, backgroundColor: t.card }]}>
            <AppleMark size={20} />
            <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 8 }]}>Apple</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/auth/sign-up')}>
          <Text style={[typography.caption, { color: t.ink3 }]}>Don't have an account? </Text>
          <Text style={[typography.caption, { color: t.brand, fontFamily: 'Inter_600SemiBold' }]}>Sign up</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  scroll:     { paddingBottom: 40 },
  logoRow:    { alignItems: 'flex-start', marginBottom: 24 },
  logoBox:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { gap: 12, marginBottom: 4 },
  forgotRow:  { alignItems: 'flex-end', marginBottom: 20 },
  mainBtn:    { marginTop: 4 },
  divider:    { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine:    { flex: 1, height: StyleSheet.hairlineWidth },
  oauthRow:   { flexDirection: 'row', gap: 12 },
  oauthBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1 },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
