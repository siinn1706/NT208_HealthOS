import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { authService } from '../../api/services';
import { useSession } from '../../auth/session-provider';
import { consumePendingSignup } from '../../auth/pending-signup';

const OTP_LEN = 6;
const COUNTDOWN_SEC = 60;

function maskContact(val: string): string {
  if (!val) return '';
  if (val.includes('@')) {
    const [u, d] = val.split('@');
    return u.length > 2 ? `${u[0]}${'·'.repeat(Math.min(u.length - 2, 4))}${u[u.length - 1]}@${d}` : val;
  }
  return val;
}

function useBlink() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 500 })),
      -1,
      false,
    );
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function OtpBox({
  value, focused, hasValue, t,
}: { value: string; focused: boolean; hasValue: boolean; t: ReturnType<typeof useTheme> }) {
  const cursorStyle = useBlink();
  return (
    <View
      style={[
        styles.box,
        { borderColor: focused ? t.brand : t.border, backgroundColor: t.card },
        focused && { borderWidth: 1.5, shadowColor: t.brand, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
      ]}
    >
      {hasValue ? (
        <Text style={[typography.title, { color: t.ink, textAlign: 'center' }]}>{value}</Text>
      ) : focused ? (
        <Animated.View style={[styles.cursor, { backgroundColor: t.brand }, cursorStyle]} />
      ) : null}
    </View>
  );
}

export function AuthOtpScreen() {
  const t = useTheme();
  const session = useSession();
  const params = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LEN).fill(''));
  const [focusIdx, setFocusIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const code = digits.join('');
  const isComplete = digits.every((d) => d !== '');

  function handleDigitChange(text: string, idx: number) {
    // Paste support: if more than 1 char entered
    if (text.length > 1) {
      const clean = text.replace(/\D/g, '').slice(0, OTP_LEN);
      const next = [...Array(OTP_LEN).fill('')];
      clean.split('').forEach((ch, i) => { next[i] = ch; });
      setDigits(next);
      const lastFilled = Math.min(clean.length, OTP_LEN - 1);
      setFocusIdx(lastFilled);
      inputRefs.current[lastFilled]?.focus();
      return;
    }
    const ch = text.replace(/\D/g, '');
    const next = [...digits];
    next[idx] = ch;
    setDigits(next);
    if (ch && idx < OTP_LEN - 1) {
      setFocusIdx(idx + 1);
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>, idx: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      setFocusIdx(idx - 1);
      inputRefs.current[idx - 1]?.focus();
    }
  }

  useEffect(() => () => { consumePendingSignup(); }, []);

  async function handleVerify() {
    if (!params.email || !isComplete) return;
    setLoading(true);
    setError(null);
    try {
      const pending = consumePendingSignup();
      const result = await authService.verifyOtp({
        email: params.email!,
        password: pending?.password,
        purpose: (params.purpose ?? 'signup') as 'signup' | 'reset_password' | 'login',
        code,
      });
      if (!('access_token' in result)) {
        setError('Verification succeeded but no session was created. Please sign in.');
        router.replace('/auth/sign-in');
        return;
      }
      await session.refreshUser();
      if (params.purpose === 'reset_password') router.replace('/auth/sign-in');
      else if (params.purpose === 'login') router.replace('/home');
      else router.replace('/onboarding/setup' as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!params.email || countdown > 0) return;
    try {
      await authService.requestOtp({ email: params.email, purpose: (params.purpose ?? 'signup') as 'signup' | 'reset_password' | 'login' });
      setCountdown(COUNTDOWN_SEC);
      setResent(true);
      setTimeout(() => setResent(false), 2000);
    } catch { /* ignore */ }
  }

  if (!params.email) {
    return (
      <View style={styles.center}>
        <Text style={[typography.bodyMed, { color: t.danger }]}>No email provided. Go back and try again.</Text>
        <Button label="Go back" onPress={() => router.replace('/auth/sign-in')} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.iconTile, { backgroundColor: t.brandSoft }]}>
        <Shield size={26} color={t.brand} />
      </View>

      <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>Verify it's you</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>
        We sent a 6-digit code to {maskContact(params.email)}
      </Text>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      {/* 6-box OTP */}
      <View style={styles.boxes}>
        {digits.map((d, i) => (
          <View key={i} style={{ flex: 1, position: 'relative' }}>
            <TextInput
              ref={(r) => { inputRefs.current[i] = r; }}
              style={styles.hiddenInput}
              value={d}
              onChangeText={(text) => handleDigitChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              onFocus={() => setFocusIdx(i)}
              keyboardType="number-pad"
              maxLength={OTP_LEN}
              caretHidden
              selectTextOnFocus={false}
            />
            <OtpBox value={d} focused={focusIdx === i} hasValue={d !== ''} t={t} />
          </View>
        ))}
      </View>

      <Button label="Verify" size="lg" loading={loading} onPress={handleVerify} style={{ marginTop: 24 }} />

      {/* Resend row — plain View; tap only when countdown expired */}
      <View style={styles.resendRow}>
        {resent ? (
          <Text style={[typography.caption, { color: t.success }]}>Sent!</Text>
        ) : countdown > 0 ? (
          <Text style={[typography.caption, { color: t.ink3 }]}>
            Didn't get it?{' '}
            <Text style={{ color: t.ink4, fontFamily: 'Inter_600SemiBold' }}>
              Resend in 0:{String(countdown).padStart(2, '0')}
            </Text>
          </Text>
        ) : (
          <Pressable
            onPress={handleResend}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
          >
            <Text style={[typography.caption, { color: t.ink3 }]}>
              Didn't get it?{' '}
              <Text style={{ color: t.brand, fontFamily: 'Inter_600SemiBold' }}>Resend code</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1 },
  center:      { flex: 1, padding: 16 },
  iconTile:    { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  boxes:       { flexDirection: 'row', gap: 10 },
  box:         { flex: 1, height: 56, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  cursor:      { width: 2, height: 22, borderRadius: 1 },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
  resendRow:   { alignItems: 'center', marginTop: 20 },
});
