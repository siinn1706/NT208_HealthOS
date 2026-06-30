import React, { useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { authService } from '../../api/services';
import { useSession } from '../../auth/session-provider';
import { localizeError } from '../../api/error-message';
import {
  getPasswordStrength,
  isPasswordComplex,
  isValidEmail,
  type PasswordStrength,
} from '../../auth/password-policy';

type ResetStep = 'email' | 'otp' | 'reset';

const RESEND_COOLDOWN_SEC = 60;

const strengthKey: Record<PasswordStrength, string> = {
  weak: 'auth.passwordStrengthWeak',
  fair: 'auth.passwordStrengthFair',
  strong: 'auth.passwordStrengthStrong',
};

export function AuthForgotPasswordScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const session = useSession();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sent, setSent] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [passwordBreached, setPasswordBreached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();
  const passwordValid = isPasswordComplex(newPassword);
  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function requestReset() {
    if (!isValidEmail(normalizedEmail)) {
      setError(i18n('auth.emailInvalid'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.requestOtp({ email: normalizedEmail, purpose: 'reset_password' });
      setSent(true);
      setCountdown(RESEND_COOLDOWN_SEC);
      setStep('otp');
    } catch (err) {
      setError(localizeError(err instanceof Error ? err : null, i18n('auth.sendResetCodeFailed')));
    } finally {
      setLoading(false);
    }
  }

  async function verifyResetCode() {
    if (code.trim().length !== 6) {
      setError(i18n('auth.otpCodeRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.verifyOtp({ email: normalizedEmail, purpose: 'reset_password', code: code.trim() });
      setStep('reset');
    } catch (err) {
      setError(localizeError(err instanceof Error ? err : null, i18n('auth.otpInvalid')));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (countdown > 0 || !isValidEmail(normalizedEmail)) return;
    setLoading(true);
    setError(null);
    try {
      await authService.requestOtp({ email: normalizedEmail, purpose: 'reset_password' });
      setSent(true);
      setCountdown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(localizeError(err instanceof Error ? err : null, i18n('auth.resendFailed')));
    } finally {
      setLoading(false);
    }
  }

  async function refreshPasswordBreachState() {
    if (!passwordValid) return;
    setCheckingPassword(true);
    try {
      const result = await authService.checkPasswordBreach(newPassword);
      setPasswordBreached(result.breached);
    } catch {
      setPasswordBreached(false);
    } finally {
      setCheckingPassword(false);
    }
  }

  async function completeReset() {
    if (!code.trim()) {
      setError(i18n('auth.otpCodeRequired'));
      return;
    }
    if (!passwordValid) {
      setError(i18n('auth.passwordRequirements'));
      return;
    }
    if (!confirmPassword) {
      setError(i18n('auth.confirmPasswordRequired'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(i18n('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await refreshPasswordBreachState();
      await authService.resetPassword(normalizedEmail, newPassword, { persistToken: false });
      await session.clearSession();
      router.replace('/auth/sign-in');
    } catch (err) {
      setError(localizeError(err instanceof Error ? err : null, i18n('auth.resetPasswordFailed')));
    } finally {
      setLoading(false);
    }
  }

  const passwordHelper = checkingPassword
    ? i18n('auth.checkingPassword')
    : passwordBreached
      ? i18n('auth.passwordBreachedWarning')
      : passwordStrength
        ? i18n(strengthKey[passwordStrength])
        : i18n('auth.passwordRequirements');

  if (step === 'otp') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.infoCard, { backgroundColor: t.brandSoft, borderRadius: t.radius.lg }]}>
          <Text style={[typography.caption, { color: t.brand }]}>
            {i18n('auth.resetCodeSentTo', { email: normalizedEmail })}
          </Text>
        </View>
        {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}
        {sent && <Text style={[typography.caption, { color: t.success, marginBottom: 10 }]}>{i18n('auth.codeSent')}</Text>}
        <Input
          label={i18n('auth.otpCode')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
        />
        <Button label={i18n('auth.verifyCode')} size="lg" loading={loading} onPress={verifyResetCode} style={{ marginTop: 8 }} />
        <Button
          label={countdown > 0 ? i18n('auth.resendIn', { seconds: countdown }) : i18n('auth.resendCode')}
          variant="ghost"
          loading={loading}
          disabled={loading || countdown > 0}
          onPress={resendCode}
          style={{ marginTop: 8 }}
        />
      </KeyboardAvoidingView>
    );
  }

  if (step === 'reset') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>{i18n('auth.resetPassword')}</Text>
        <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>
          {i18n('auth.resetPasswordSubtitle')}
        </Text>

        {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

        <Input
          label={i18n('auth.newPassword')}
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            setPasswordBreached(false);
          }}
          onBlur={() => { void refreshPasswordBreachState(); }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={i18n('auth.newPasswordPlaceholder')}
          helper={passwordHelper}
          error={newPassword && !passwordValid ? i18n('auth.passwordRequirements') : undefined}
          valid={passwordValid && !passwordBreached}
        />
        {passwordBreached && (
          <Text style={[typography.caption, { color: t.danger, marginTop: 8 }]}>{i18n('auth.passwordBreachedWarning')}</Text>
        )}
        <Input
          label={i18n('auth.confirmNewPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={i18n('auth.confirmNewPasswordPlaceholder')}
          error={confirmPassword && newPassword !== confirmPassword ? i18n('auth.passwordMismatch') : undefined}
          valid={confirmPassword.length > 0 && newPassword === confirmPassword}
          style={{ marginTop: 12 }}
        />
        <Button label={i18n('auth.resetPassword')} size="lg" loading={loading} onPress={completeReset} style={{ marginTop: 16 }} />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Text style={[typography.title, { color: t.ink, marginBottom: 4 }]}>{i18n('auth.forgotPasswordTitle')}</Text>
      <Text style={[typography.body, { color: t.ink3, marginBottom: 24 }]}>
        {i18n('auth.forgotPasswordSubtitle')}
      </Text>

      <View style={[styles.infoCard, { backgroundColor: t.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.border, padding: 14, marginBottom: 20 }]}>
        <Shield size={14} color={t.ink3} style={{ marginRight: 6 }} />
        <Text style={[typography.caption, { color: t.ink3, flex: 1 }]}>
          {i18n('auth.forgotPasswordSecurityNote')}
        </Text>
      </View>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      <Input
        label={i18n('auth.email')}
        value={email}
        onChangeText={(value) => setEmail(value.trim().toLowerCase())}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder={i18n('auth.emailPlaceholder')}
      />

      <Button label={i18n('auth.sendResetCode')} size="lg" loading={loading} onPress={requestReset} style={{ marginTop: 8 }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start' },
});
