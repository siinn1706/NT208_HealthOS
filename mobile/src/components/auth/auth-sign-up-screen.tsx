import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { ProgressBar } from '../primitives/progress-bar';
import { authService } from '../../api/services';
import { useTranslation } from 'react-i18next';
import { setPendingSignup } from '../../auth/pending-signup';
import { localizeError } from '../../api/error-message';
import {
  getPasswordStrength,
  isPasswordComplex,
  isValidEmail,
  isValidUsername,
  sanitizeUsername,
  type PasswordStrength,
} from '../../auth/password-policy';

const AVAILABILITY_DEBOUNCE_MS = 350;

const strengthKey: Record<PasswordStrength, string> = {
  weak: 'auth.passwordStrengthWeak',
  fair: 'auth.passwordStrengthFair',
  strong: 'auth.passwordStrengthStrong',
};

export function AuthSignUpScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [passwordBreached, setPasswordBreached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestEmailRef = useRef('');
  const latestUsernameRef = useRef('');

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();
  const passwordValid = isPasswordComplex(password);
  const passwordStrength = password ? getPasswordStrength(password) : null;

  useEffect(() => () => {
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
  }, []);

  function validateLocal() {
    if (!normalizedUsername) return i18n('auth.usernameRequired');
    if (!isValidUsername(normalizedUsername)) return i18n('auth.usernameInvalid');
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) return i18n('auth.emailInvalid');
    if (!passwordValid) return i18n('auth.passwordRequirements');
    if (!confirmPassword) return i18n('auth.confirmPasswordRequired');
    if (password !== confirmPassword) return i18n('auth.passwordMismatch');
    if (usernameAvailable === false) return i18n('auth.usernameTaken');
    if (emailAvailable === false) return i18n('auth.emailTaken');
    return null;
  }

  async function checkUsernameAvailability(value = normalizedUsername) {
    if (!isValidUsername(value)) {
      setUsernameAvailable(null);
      return null;
    }
    const checkedUsername = value;
    setCheckingAvailability(true);
    try {
      const available = await authService.checkUsernameAvailability(checkedUsername);
      if (latestUsernameRef.current !== checkedUsername) return null;
      setUsernameAvailable(available);
      return available;
    } catch {
      if (latestUsernameRef.current === checkedUsername) setUsernameAvailable(null);
      return null;
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function checkEmailAvailability(value = normalizedEmail) {
    if (!isValidEmail(value)) {
      setEmailAvailable(null);
      return null;
    }
    const checkedEmail = value;
    setCheckingAvailability(true);
    try {
      const available = await authService.checkEmailAvailability(checkedEmail);
      if (latestEmailRef.current !== checkedEmail) return null;
      setEmailAvailable(available);
      return available;
    } catch {
      if (latestEmailRef.current === checkedEmail) setEmailAvailable(null);
      return null;
    } finally {
      setCheckingAvailability(false);
    }
  }

  function handleUsernameChange(value: string) {
    const next = sanitizeUsername(value);
    latestUsernameRef.current = next;
    setUsername(next);
    setUsernameAvailable(null);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (isValidUsername(next)) {
      usernameTimer.current = setTimeout(() => {
        void checkUsernameAvailability(next);
      }, AVAILABILITY_DEBOUNCE_MS);
    }
  }

  function handleEmailChange(value: string) {
    const next = value.trim().toLowerCase();
    latestEmailRef.current = next;
    setEmail(next);
    setEmailAvailable(null);
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (isValidEmail(next)) {
      emailTimer.current = setTimeout(() => {
        void checkEmailAvailability(next);
      }, AVAILABILITY_DEBOUNCE_MS);
    }
  }

  function handleUsernameBlur() {
    if (usernameTimer.current) {
      clearTimeout(usernameTimer.current);
      usernameTimer.current = null;
    }
    void checkUsernameAvailability();
  }

  function handleEmailBlur() {
    if (emailTimer.current) {
      clearTimeout(emailTimer.current);
      emailTimer.current = null;
    }
    void checkEmailAvailability();
  }

  async function refreshPasswordBreachState() {
    if (!passwordValid) return;
    setCheckingPassword(true);
    try {
      const result = await authService.checkPasswordBreach(password);
      setPasswordBreached(result.breached);
    } catch {
      setPasswordBreached(false);
    } finally {
      setCheckingPassword(false);
    }
  }

  async function handleContinue() {
    const msg = validateLocal();
    if (msg) { setError(msg); return; }

    setLoading(true);
    setError(null);
    try {
      const [emailOk, usernameOk] = await Promise.all([
        checkEmailAvailability(normalizedEmail),
        checkUsernameAvailability(normalizedUsername),
      ]);

      if (emailOk === false) {
        setError(i18n('auth.emailTaken'));
        return;
      }
      if (usernameOk === false) {
        setError(i18n('auth.usernameTaken'));
        return;
      }

      await refreshPasswordBreachState();

      await authService.requestOtp({
        email: normalizedEmail,
        username: normalizedUsername,
        password,
        purpose: 'signup',
      });
      setPendingSignup({ email: normalizedEmail, username: normalizedUsername });
      router.push({ pathname: '/auth/otp', params: { email: normalizedEmail, purpose: 'signup' } });
    } catch (err) {
      setError(localizeError(err instanceof Error ? err : null, i18n('auth.signUpRequestFailed')));
    } finally {
      setLoading(false);
    }
  }

  const usernameError = username && !isValidUsername(normalizedUsername)
    ? i18n('auth.usernameInvalid')
    : usernameAvailable === false
      ? i18n('auth.usernameTaken')
      : undefined;
  const emailError = email && !isValidEmail(normalizedEmail)
    ? i18n('auth.emailInvalid')
    : emailAvailable === false
      ? i18n('auth.emailTaken')
      : undefined;
  const passwordHelper = checkingPassword
    ? i18n('auth.checkingPassword')
    : passwordBreached
      ? i18n('auth.passwordBreachedWarning')
      : passwordStrength
        ? i18n(strengthKey[passwordStrength])
        : i18n('auth.passwordRequirements');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View>
      <View style={styles.progressWrap}>
        <ProgressBar value={0.5} height={6} />
      </View>

      <Text style={[typography.title, { color: t.ink, marginTop: 20, marginBottom: 0 }]}>{i18n('auth.createAccount')}</Text>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 4, marginBottom: 22 }]}>
        {i18n('auth.createAccountSubtitle')}{' '}
        <Text style={{ color: t.ink2, fontFamily: 'Inter_600SemiBold' }}>{i18n('auth.signUpStep')}</Text>
      </Text>

      {error && <Text style={[typography.caption, { color: t.danger, marginBottom: 10 }]}>{error}</Text>}

      <View style={styles.fieldGroup}>
        <Input
          label={i18n('auth.usernameLabel')}
          value={username}
          onChangeText={handleUsernameChange}
          onBlur={handleUsernameBlur}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          placeholder={i18n('auth.usernamePlaceholder')}
          helper={usernameAvailable === true ? i18n('auth.usernameAvailable') : i18n('auth.usernameHelper')}
          error={usernameError}
          valid={usernameAvailable === true}
        />
        <Input
          label={i18n('auth.email')}
          value={email}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder={i18n('auth.emailPlaceholder')}
          helper={emailAvailable === true ? i18n('auth.emailAvailable') : undefined}
          error={emailError}
          valid={emailAvailable === true}
        />
        <Input
          label={i18n('auth.password')}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setPasswordBreached(false);
          }}
          onBlur={() => { void refreshPasswordBreachState(); }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={i18n('auth.passwordPlaceholder')}
          helper={passwordHelper}
          error={password && !passwordValid ? i18n('auth.passwordRequirements') : undefined}
          valid={passwordValid && !passwordBreached}
        />
        <Input
          label={i18n('auth.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={i18n('auth.confirmPasswordPlaceholder')}
          error={confirmPassword && password !== confirmPassword ? i18n('auth.passwordMismatch') : undefined}
          valid={confirmPassword.length > 0 && password === confirmPassword}
        />
      </View>

      {checkingAvailability && (
        <Text style={[typography.caption, { color: t.ink3, marginTop: 8 }]}>{i18n('auth.checkingAvailability')}</Text>
      )}

      {passwordBreached && (
        <Text style={[typography.caption, { color: t.danger, marginTop: 8 }]}>{i18n('auth.passwordBreachedWarning')}</Text>
      )}

      <Button
        label={i18n('common.continue')}
        size="lg"
        loading={loading}
        disabled={loading || checkingAvailability}
        onPress={handleContinue}
        style={styles.mainBtn}
      />
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  progressWrap: { marginTop: 12, marginBottom: 0 },
  fieldGroup: { gap: 12, marginBottom: 4 },
  mainBtn: { marginTop: 16 },
});
