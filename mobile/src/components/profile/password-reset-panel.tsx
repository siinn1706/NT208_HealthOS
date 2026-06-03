import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Card } from '../primitives/card';
import { Input } from '../primitives/input/input';
import { ApiState } from '../api/api-state';
import { authService } from '../../api/services/auth-service';
import { useTranslation } from 'react-i18next';

interface PasswordResetPanelProps {
  email?: string | null;
  onClose: () => void;
  onSessionRefresh: () => Promise<unknown>;
}

export function PasswordResetPanel({ email, onClose, onSessionRefresh }: PasswordResetPanelProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function sendResetCode() {
    if (!email) {
      setError('No account email is available for password reset.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.requestOtp({ email, purpose: 'reset_password' });
      setSent(true);
      setSuccess(`Reset code sent to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!email) {
      setError('No account email is available for password reset.');
      return;
    }
    if (!code.trim() || newPassword.length < 8 || newPassword !== confirmPassword) {
      setError('Enter the code and matching passwords with at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.verifyOtp({ email, purpose: 'reset_password', code: code.trim() });
      await authService.resetPassword(email, newPassword);
      const refreshed = await onSessionRefresh();
      if (!refreshed) {
        setError('Password reset, but account refresh failed. Sign in again.');
        return;
      }
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password reset. Your session is refreshed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>Password reset</Text>
          <Text style={[typography.micro, { color: t.ink3 }]}>Verify by email before setting a new password.</Text>
        </View>
        <Button label={i18n('common.close')} variant="text" size="sm" onPress={onClose} />
      </View>

      {!email && <ApiState title="Password reset unavailable" message="Your session does not include an email address." />}
      {error && <ApiState title="Password reset failed" message={error} />}
      {success && <Text style={[typography.micro, { color: t.success }]}>{success}</Text>}

      {!sent ? (
        <Button
          label={loading ? 'Sending...' : 'Send reset code'}
          variant="soft"
          onPress={sendResetCode}
          disabled={loading || !email}
        />
      ) : (
        <View style={styles.form}>
          <Input label={i18n('auth.otpCode')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="000000" />
          <Input label={i18n('auth.newPassword')} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Min 8 characters" />
          <Input label={i18n('auth.confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repeat new password" />
          <Button label={loading ? 'Resetting...' : 'Reset password'} variant="solid" onPress={resetPassword} disabled={loading} />
          <Button label={i18n('auth.sendNewCode')} variant="ghost" onPress={sendResetCode} disabled={loading} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  form: { gap: 10 },
});
