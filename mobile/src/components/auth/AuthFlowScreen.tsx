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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { PermissionsScreen } from './PermissionsScreen';
import { authService } from '../../api/services';
import { useSession } from '../../auth/SessionProvider';

export type AuthKind = 'welcome' | 'sign-in' | 'sign-up' | 'otp' | 'setup' | 'forgot' | 'permissions';

interface AuthFlowScreenProps {
  kind: AuthKind;
  permissionKind?: 'notifications' | 'camera' | 'health-data';
}

// ─── Welcome ────────────────────────────────────────────────────────────────

function WelcomeScreen({ t }: { t: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.center}>
      <Text style={[styles.logo, { color: t.primary }]}>HealthOS</Text>
      <Text style={[styles.tagline, { color: t.ink3 }]}>
        Your personal health companion
      </Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: t.primary }]}
        onPress={() => router.push('/auth/sign-up')}
      >
        <Text style={[styles.btnLabel, { color: t.primaryInk }]}>Get started</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnOutline, { borderColor: t.border }]}
        onPress={() => router.push('/auth/sign-in')}
      >
        <Text style={[styles.btnLabelAlt, { color: t.ink }]}>Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Sign In ────────────────────────────────────────────────────────────────

function FormMessage({ text, t }: { text: string | null; t: ReturnType<typeof useTheme> }) {
  if (!text) return null;
  return <Text style={[styles.message, { color: t.danger }]}>{text}</Text>;
}

function SignInScreen({ t }: { t: ReturnType<typeof useTheme> }) {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.length > 0;

  async function handleSignIn() {
    if (!isValid) {
      setError('Email and password are required.');
      return;
    }
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
      <Text style={[styles.heading, { color: t.ink }]}>Welcome back</Text>
      <FormMessage text={error} t={t} />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Email"
        placeholderTextColor={t.ink3}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Password"
        placeholderTextColor={t.ink3}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: t.primary }, (loading || !isValid) && styles.disabled]}
        onPress={handleSignIn}
        disabled={loading || !isValid}
      >
        <Text style={[styles.btnLabel, { color: t.primaryInk }]}>{loading ? 'Signing in...' : 'Sign in'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/auth/forgot' as never)}>
        <Text style={[styles.link, { color: t.primary }]}>Forgot password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
        <Text style={[styles.link, { color: t.primary }]}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ─── Sign Up ────────────────────────────────────────────────────────────────

function SignUpScreen({ t }: { t: ReturnType<typeof useTheme> }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!name.trim()) return 'Full name is required.';
    if (!email.trim() || !email.includes('@')) return 'A valid email is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  }

  const validationError = validate();
  const isValid = validationError === null;

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
      router.push({
        pathname: '/auth/otp',
        params: { email: email.trim(), password, purpose: 'signup' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request OTP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Text style={[styles.heading, { color: t.ink }]}>Create account</Text>
      <FormMessage text={error} t={t} />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Full name"
        placeholderTextColor={t.ink3}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Username"
        placeholderTextColor={t.ink3}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Email"
        placeholderTextColor={t.ink3}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Password (min 8 chars)"
        placeholderTextColor={t.ink3}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: t.primary }, (loading || !isValid) && styles.disabled]}
        onPress={handleContinue}
        disabled={loading || !isValid}
      >
        <Text style={[styles.btnLabel, { color: t.primaryInk }]}>{loading ? 'Sending code...' : 'Continue'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/auth/sign-in')}>
        <Text style={[styles.link, { color: t.primary }]}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ─── OTP ────────────────────────────────────────────────────────────────────

function OtpScreen({ t }: { t: ReturnType<typeof useTheme> }) {
  const [code, setCode] = useState('');
  const params = useLocalSearchParams<{ email?: string; password?: string; purpose?: 'signup' | 'reset_password' | 'login' }>();
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const codeValid = /^\d{6}$/.test(code);

  // Missing email — recoverable state
  if (!params.email) {
    return (
      <View style={styles.flex}>
        <Text style={[styles.heading, { color: t.ink }]}>Verify your email</Text>
        <Text style={[styles.message, { color: t.danger }]}>No email provided. Please go back and try again.</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.primary }]}
          onPress={() => router.replace('/auth/sign-in')}
        >
          <Text style={[styles.btnLabel, { color: t.primaryInk }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleVerify() {
    if (!codeValid) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.verifyOtp({
        email: params.email!,
        password: params.password,
        purpose: params.purpose ?? 'signup',
        code,
      });
      await session.refreshUser();
      if (params.purpose === 'reset_password') {
        router.replace('/auth/sign-in');
      } else if (params.purpose === 'login') {
        router.replace('/(tabs)/home');
      } else {
        // 'signup' (default)
        router.replace('/auth/setup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!params.email) return;
    try {
      await authService.requestOtp({ email: params.email, purpose: params.purpose ?? 'signup' });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch {
      // ignore resend errors silently
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Text style={[styles.heading, { color: t.ink }]}>Verify your email</Text>
      <FormMessage text={error} t={t} />
      <Text style={[styles.subheading, { color: t.ink3 }]}>
        Enter the 6-digit code we sent you
      </Text>
      <TextInput
        style={[styles.otpInput, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="000000"
        placeholderTextColor={t.ink3}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: t.primary }, (loading || !codeValid) && styles.disabled]}
        onPress={handleVerify}
        disabled={loading || !codeValid}
      >
        <Text style={[styles.btnLabel, { color: t.primaryInk }]}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResend} disabled={loading}>
        <Text style={[styles.link, { color: t.primary }]}>{resent ? 'Resent!' : 'Resend code'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ─── Setup (health profile) ──────────────────────────────────────────────────

function SetupScreen({ t }: { t: ReturnType<typeof useTheme> }) {
  const session = useSession();
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    // DOB: if filled, normalizeDate must produce a valid ISO date string
    if (dob.trim()) {
      const parsedDob = normalizeDate(dob);
      if (!parsedDob || !/^\d{4}-\d{2}-\d{2}$/.test(parsedDob)) {
        return 'Date of birth must be in DD/MM/YYYY format.';
      }
    }
    const h = Number(height);
    if (height && (isNaN(h) || h <= 50 || h >= 300)) return 'Height must be between 51 and 299 cm.';
    const w = Number(weight);
    if (weight && (isNaN(w) || w <= 10 || w >= 500)) return 'Weight must be between 11 and 499 kg.';
    return null;
  }

  const isValid = validate() === null;

  async function handleFinish() {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setLoading(true);
    setError(null);
    try {
      await session.updateProfile({
        date_of_birth: normalizeDate(dob),
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        onboarding_completed: true,
      });
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Text style={[styles.heading, { color: t.ink }]}>Set up your health profile</Text>
      <FormMessage text={error} t={t} />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Date of birth (DD/MM/YYYY)"
        placeholderTextColor={t.ink3}
        value={dob}
        onChangeText={setDob}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Height (cm)"
        placeholderTextColor={t.ink3}
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.ink, backgroundColor: t.card }]}
        placeholder="Weight (kg)"
        placeholderTextColor={t.ink3}
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: t.primary }, (loading || !isValid) && styles.disabled]}
        onPress={handleFinish}
        disabled={loading || !isValid}
      >
        <Text style={[styles.btnLabel, { color: t.primaryInk }]}>{loading ? 'Saving...' : 'Finish setup'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function normalizeUsername(value: string) {
  const base = value.split('@')[0] ?? value;
  const normalized = base.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+/, '');
  const withLetter = /^[a-z]/.test(normalized) ? normalized : `u_${normalized}`;
  return withLetter.slice(0, 30).padEnd(3, '0');
}

// ─── Router ─────────────────────────────────────────────────────────────────

export function AuthFlowScreen({ kind, permissionKind }: AuthFlowScreenProps) {
  const t = useTheme();

  const inner: Record<AuthKind, React.ReactElement> = {
    welcome:     <WelcomeScreen t={t} />,
    'sign-in':   <SignInScreen t={t} />,
    'sign-up':   <SignUpScreen t={t} />,
    otp:         <OtpScreen t={t} />,
    setup:       <SetupScreen t={t} />,
    forgot:      <ForgotPasswordScreen t={t} />,
    permissions: <PermissionsScreen kind={permissionKind ?? 'notifications'} t={t} />,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.container, kind === 'welcome' && styles.centerContainer]}>
        {inner[kind]}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1 },
  flex:            { flex: 1 },
  container:       { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  centerContainer: { justifyContent: 'center' },
  center:          { alignItems: 'center', gap: 12 },
  logo:            { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  tagline:         { fontSize: 16, marginBottom: 32 },
  heading:         { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subheading:      { fontSize: 15, marginBottom: 24 },
  message:         { fontSize: 13, marginBottom: 12 },
  disabled:        { opacity: 0.55 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  otpInput: {
    height: 60,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 24,
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
  btnOutline: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnLabel:    { fontSize: 16, fontWeight: '600' },
  btnLabelAlt: { fontSize: 16, fontWeight: '500' },
  link:        { fontSize: 14, textAlign: 'center', marginTop: 16 },
});
