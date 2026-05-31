import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { useSession } from '../../auth/session-provider';
import { authService, profileService } from '../../api/services';
import { ApiState } from '../api/api-state';
import { Button } from '../primitives/button';
import { Card } from '../primitives/card';
import { Input } from '../primitives/input/input';
import { IconShield, IconTrash } from '../../icons';

interface AccountDeletionCardProps {
  onDeleted?: () => void;
}

function formatPurgeDate(value: string | null) {
  if (!value) return 'the scheduled purge window';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function AccountDeletionCard({ onDeleted }: AccountDeletionCardProps) {
  const t = useTheme();
  const { user, clearSession } = useSession();
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [reason, setReason] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'otp' | 'delete' | null>(null);

  const userEmail = user?.email ?? '';
  const emailMatches = useMemo(
    () => userEmail.length > 0 && normalizeEmail(confirmationEmail) === normalizeEmail(userEmail),
    [confirmationEmail, userEmail],
  );
  const hasVerifier = password.trim().length > 0 || otpCode.trim().length === 6;
  const canDelete = emailMatches && hasVerifier && busyAction === null;

  async function requestDeleteCode() {
    if (!userEmail) {
      setError('Refresh your profile before requesting a deletion code.');
      return;
    }
    setBusyAction('otp');
    setError(null);
    setStatusText(null);
    try {
      const response = await authService.requestOtp({
        email: userEmail,
        purpose: 'delete_account',
      });
      setStatusText(`Deletion code sent. Expires in ${response.data.expires_in_seconds} seconds.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request deletion code.');
    } finally {
      setBusyAction(null);
    }
  }

  async function scheduleDeletion() {
    if (!emailMatches) {
      setError('Type your account email to confirm deletion.');
      return;
    }
    if (!hasVerifier) {
      setError('Enter your password or 6-digit deletion code.');
      return;
    }
    setBusyAction('delete');
    setError(null);
    try {
      const result = await profileService.requestAccountDeletion({
        confirmation_email: confirmationEmail.trim(),
        password: password.trim() || undefined,
        otp_code: otpCode.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setStatusText(`Deletion scheduled. Account can be restored until ${formatPurgeDate(result.purge_at)}.`);
      await clearSession();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule account deletion.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <View style={[styles.iconBox, { backgroundColor: `${t.danger}18` }]}>
          <IconTrash size={18} color={t.danger} />
        </View>
        <View style={styles.titleText}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>Delete account</Text>
          <Text style={[typography.micro, { color: t.ink3 }]}>
            Schedules account deletion and signs this device out.
          </Text>
        </View>
      </View>

      <View style={[styles.notice, { borderColor: t.border, backgroundColor: t.bgElev }]}>
        <IconShield size={15} color={t.ink3} />
        <Text style={[typography.micro, styles.noticeText, { color: t.ink3 }]}>
          Type your email. Use password for password accounts, or request a code for OAuth-only accounts.
        </Text>
      </View>

      <Input
        label="Confirm email"
        value={confirmationEmail}
        onChangeText={setConfirmationEmail}
        placeholder={userEmail || 'you@example.com'}
        autoCapitalize="none"
        keyboardType="email-address"
        error={confirmationEmail.length > 0 && !emailMatches ? 'Email does not match this account.' : undefined}
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Account password"
        secureTextEntry
        autoCapitalize="none"
      />
      <Input
        label="Deletion code"
        value={otpCode}
        onChangeText={(value) => setOtpCode(value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
      />
      <Input
        label="Reason"
        value={reason}
        onChangeText={setReason}
        placeholder="Optional"
        multiline
      />

      {statusText && <Text style={[typography.micro, { color: t.success }]}>{statusText}</Text>}
      {error && <ApiState title="Account deletion unavailable" message={error} />}

      <View style={styles.buttonRow}>
        <Button
          label={busyAction === 'otp' ? 'Sending...' : 'Send deletion code'}
          variant="ghost"
          size="sm"
          onPress={requestDeleteCode}
          disabled={busyAction !== null || !userEmail}
        />
        <Button
          label={busyAction === 'delete' ? 'Scheduling...' : 'Schedule deletion'}
          variant="solid"
          size="sm"
          icon={<IconTrash size={15} color="#FFF" />}
          onPress={scheduleDeletion}
          disabled={!canDelete}
          style={{ backgroundColor: t.danger }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleText: { flex: 1, minWidth: 0 },
  notice: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8, flexDirection: 'row' },
  noticeText: { flex: 1 },
  buttonRow: { gap: 10 },
});
