import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { Toggle } from '../primitives/toggle';
import { ApiState } from '../api/api-state';
import { Input } from '../primitives/input/input';
import { Button } from '../primitives/button';
import {
  ChevronLeft, ChevronRight, IconShield, IconLock,
  IconActivity, IconRefresh, IconAlert,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { useSession } from '../../auth/session-provider';
import { useApiQuery, invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { securityService, type MfaSetupPayload } from '../../api/services/security-service';
import { PasswordResetPanel } from './password-reset-panel';

interface SettingRowProps {
  label: string;
  sub?: string;
  iconColor?: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  badge?: { label: string; color: string; bg: string };
  toggle?: boolean;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}

function SettingRow({ label, sub, iconColor, Icon, badge, toggle, value, onPress, last }: SettingRowProps) {
  const t = useTheme();
  const [on, setOn] = useState(toggle ?? false);
  const ic = iconColor ?? t.brand;

  return (
    <>
      <TouchableOpacity style={styles.settingRow} onPress={onPress ?? (toggle !== undefined ? () => setOn((v) => !v) : undefined)} activeOpacity={0.7}>
        <View style={[styles.settingIcon, { backgroundColor: `${ic}18` }]}>
          <Icon size={18} color={ic} />
        </View>
        <View style={styles.settingText}>
          <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]}>{label}</Text>
          {sub && <Text style={[typography.micro, { color: t.ink3, marginTop: 1 }]}>{sub}</Text>}
        </View>
        {toggle !== undefined ? (
          <Toggle value={on} onChange={setOn} />
        ) : badge ? (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[typography.micro, { color: badge.color, fontWeight: '700', fontSize: 10 }]}>{badge.label}</Text>
          </View>
        ) : value ? (
          <View style={styles.valueRow}>
            <Text style={[typography.micro, { color: t.ink3 }]}>{value}</Text>
            <ChevronRight size={14} color={t.ink4} />
          </View>
        ) : (
          <ChevronRight size={14} color={t.ink4} />
        )}
      </TouchableOpacity>
      {!last && <View style={[styles.divider, { backgroundColor: t.border }]} />}
    </>
  );
}

export function SecurityScreen() {
  const t = useTheme();
  const { user, refreshUser } = useSession();
  const mfaQuery = useApiQuery(queryKeys.mfaStatus, () => securityService.mfaStatus());
  const logsQuery = useApiQuery(queryKeys.securityLogs, () => securityService.securityLogs({ limit: 8 }));
  const [setupPayload, setSetupPayload] = useState<MfaSetupPayload | null>(null);
  const [latestRecoveryCodes, setLatestRecoveryCodes] = useState<string[] | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'setup' | 'verify-setup' | 'verify' | 'disable' | 'regen' | null>(null);

  const mfaEnabled = Boolean(mfaQuery.data?.enabled);

  function showUnavailable(message: string) {
    setActionSuccess(null);
    setActionError(message);
  }

  function pointToMfaControls() {
    setActionError(null);
    setActionSuccess('Use the MFA controls below to verify, regenerate recovery codes, or disable MFA.');
  }

  function openPasswordReset() {
    setActionError(null);
    setActionSuccess(null);
    setPasswordResetOpen(true);
  }

  async function startMfaSetup() {
    setBusyAction('setup');
    setActionError(null);
    setActionSuccess(null);
    try {
      const payload = await securityService.mfaSetup();
      setSetupPayload(payload);
      setLatestRecoveryCodes(payload.recovery_codes);
      setActionSuccess('MFA setup generated. Verify once to enable.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start MFA setup.');
    } finally {
      setBusyAction(null);
    }
  }

  async function verifySetup() {
    if (!mfaCode.trim()) return;
    setBusyAction('verify-setup');
    setActionError(null);
    setActionSuccess(null);
    try {
      await securityService.verifyMfaSetup(mfaCode.trim());
      invalidateApiQuery(queryKeys.mfaStatus);
      await mfaQuery.reload();
      setSetupPayload(null);
      setMfaCode('');
      setActionSuccess('MFA enabled.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not verify MFA setup.');
    } finally {
      setBusyAction(null);
    }
  }

  async function verifyMfaCode() {
    if (!mfaCode.trim()) return;
    setBusyAction('verify');
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await securityService.verifyMfa(mfaCode.trim());
      setActionSuccess(`MFA verified via ${result.method}.`);
      setMfaCode('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not verify MFA code.');
    } finally {
      setBusyAction(null);
    }
  }

  async function disableMfa() {
    if (!mfaCode.trim()) return;
    setBusyAction('disable');
    setActionError(null);
    setActionSuccess(null);
    try {
      await securityService.disableMfa(mfaCode.trim());
      invalidateApiQuery(queryKeys.mfaStatus);
      await mfaQuery.reload();
      setMfaCode('');
      setSetupPayload(null);
      setLatestRecoveryCodes(null);
      setActionSuccess('MFA disabled.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not disable MFA.');
    } finally {
      setBusyAction(null);
    }
  }

  async function regenerateRecoveryCodes() {
    if (!mfaCode.trim()) return;
    setBusyAction('regen');
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await securityService.regenerateRecoveryCodes(mfaCode.trim());
      setLatestRecoveryCodes(result.recovery_codes ?? null);
      setMfaCode('');
      setActionSuccess('Recovery codes regenerated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not regenerate recovery codes.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Screen>
      <TopBar
        title="Security"
        left={(
          <IconButton
            variant="subtle"
            icon={<ChevronLeft size={20} color={t.ink3} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        )}
      />

      <View style={[styles.statusHero, { backgroundColor: mfaEnabled ? t.successSoft : t.warningSoft, borderColor: `${mfaEnabled ? t.success : t.warning}40` }]}>
        <View style={[styles.statusIcon, { backgroundColor: mfaEnabled ? t.success : t.warning }]}>
          <IconShield size={26} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyMed, { color: mfaEnabled ? t.success : t.warning, fontWeight: '800', fontSize: 15 }]}>
            {mfaEnabled ? 'MFA is active' : 'Recommended next step'}
          </Text>
          <Text style={[typography.micro, { color: t.ink2, marginTop: 2, lineHeight: 18 }]}>
            {mfaEnabled
              ? 'Your account currently requires a second factor.'
              : 'Turn on two-factor authentication to protect your health records.'}
          </Text>
        </View>
      </View>

      <SectionHeader title="Sign-in" />
      <Card tight style={styles.sectionCard}>
        <SettingRow
          Icon={IconLock}
          iconColor="#1965B3"
          label="Password"
          sub="Email-verified reset"
          onPress={openPasswordReset}
        />
        <SettingRow
          Icon={IconShield}
          iconColor={mfaEnabled ? t.success : t.warning}
          label="Two-factor authentication"
          badge={{ label: mfaEnabled ? 'ON' : 'OFF', color: mfaEnabled ? t.success : t.warning, bg: mfaEnabled ? t.successSoft : t.warningSoft }}
          onPress={mfaEnabled ? pointToMfaControls : startMfaSetup}
        />
        <SettingRow
          Icon={IconShield}
          iconColor="#7B5BB6"
          label="Face ID"
          sub="Requires native biometric app-lock support"
          value="Unavailable"
          onPress={() => showUnavailable('Face ID is not available until native biometric app-lock support is implemented.')}
        />
        <SettingRow
          Icon={IconLock}
          label="App lock"
          sub="6-digit PIN · auto-lock after 1 min"
          value="On"
          last
          onPress={() => showUnavailable('Native app lock settings are not backed by a confirmed secure-storage contract yet.')}
        />
      </Card>

      {passwordResetOpen && (
        <PasswordResetPanel
          email={user?.email}
          onClose={() => setPasswordResetOpen(false)}
          onSessionRefresh={refreshUser}
        />
      )}

      <Card style={styles.mfaCard}>
        {mfaQuery.isLoading && <ApiState title="Loading MFA status" loading />}
        {mfaQuery.error && (
          <ApiState
            title="MFA status unavailable"
            message={mfaQuery.error.message}
            actionLabel="Retry"
            onAction={mfaQuery.reload}
          />
        )}
        {!mfaQuery.isLoading && !mfaQuery.error && (
          <>
            {!mfaEnabled && (
              <Button
                label={busyAction === 'setup' ? 'Generating setup…' : 'Start MFA setup'}
                variant="soft"
                onPress={startMfaSetup}
                disabled={busyAction !== null}
              />
            )}

            <Input
              label={mfaEnabled ? 'MFA code' : 'Setup verification code'}
              value={mfaCode}
              onChangeText={setMfaCode}
              placeholder="123456"
              keyboardType="number-pad"
            />

            {!mfaEnabled && setupPayload && (
              <View style={[styles.secretBox, { borderColor: t.border, backgroundColor: t.bgElev }]}>
                <Text style={[typography.micro, { color: t.ink3 }]}>Secret key</Text>
                <Text selectable style={[typography.body, { color: t.ink, marginTop: 2 }]}>{setupPayload.secret}</Text>
                <Text style={[typography.micro, { color: t.ink3, marginTop: 10 }]}>QR code</Text>
                <Image
                  source={{ uri: `data:image/png;base64,${setupPayload.qr_code}` }}
                  style={styles.qr}
                  resizeMode="contain"
                />
              </View>
            )}

            {!mfaEnabled && (
              <Button
                label={busyAction === 'verify-setup' ? 'Enabling MFA…' : 'Verify setup and enable'}
                variant="solid"
                onPress={verifySetup}
                disabled={busyAction !== null || !setupPayload || !mfaCode.trim()}
              />
            )}

            {mfaEnabled && (
              <View style={styles.mfaButtonGrid}>
                <Button
                  label={busyAction === 'verify' ? 'Verifying…' : 'Verify code'}
                  variant="soft"
                  onPress={verifyMfaCode}
                  disabled={busyAction !== null || !mfaCode.trim()}
                  style={styles.halfButton}
                />
                <Button
                  label={busyAction === 'regen' ? 'Regenerating…' : 'Regenerate recovery'}
                  variant="ghost"
                  onPress={regenerateRecoveryCodes}
                  disabled={busyAction !== null || !mfaCode.trim()}
                  style={styles.halfButton}
                />
                <Button
                  label={busyAction === 'disable' ? 'Disabling…' : 'Disable MFA'}
                  variant="ghost"
                  onPress={disableMfa}
                  disabled={busyAction !== null || !mfaCode.trim()}
                  style={[styles.fullButton, { borderColor: `${t.danger}30` }]}
                  labelColor={t.danger}
                />
              </View>
            )}
          </>
        )}
      </Card>

      {actionError && <ApiState title="Security action failed" message={actionError} />}
      {actionSuccess && (
        <Text style={[typography.micro, { color: t.success, marginHorizontal: 16, marginTop: 6 }]}>{actionSuccess}</Text>
      )}

      {latestRecoveryCodes && latestRecoveryCodes.length > 0 && (
        <Card style={styles.recoveryCard}>
          <Text style={[typography.bodyMed, { color: t.ink }]}>Recovery codes</Text>
          <Text style={[typography.micro, { color: t.ink3, marginTop: 3 }]}>
            Store these somewhere safe. They are shown only once by the server.
          </Text>
          <View style={{ marginTop: 8, gap: 6 }}>
            {latestRecoveryCodes.map((code) => (
              <Text key={code} selectable style={[typography.bodyMed, { color: t.ink }]}>{code}</Text>
            ))}
          </View>
        </Card>
      )}

      <SectionHeader title="Devices & sessions" />
      <Card tight style={styles.sectionCard}>
        <SettingRow
          Icon={IconActivity}
          iconColor="#1965B3"
          label="Active sessions"
          sub={user ? 'This device' : 'No active sessions'}
          onPress={() => showUnavailable('Active session management is not available in the native app yet.')}
        />
        <SettingRow
          Icon={IconRefresh}
          iconColor={t.ink3}
          label="Recent activity"
          sub="Sign-ins, password changes, MFA events"
          last
          onPress={logsQuery.reload}
        />
      </Card>

      <Card style={styles.logsCard}>
        {logsQuery.isLoading && <ApiState title="Loading security logs" loading />}
        {logsQuery.error && (
          <ApiState
            title="Security logs unavailable"
            message={logsQuery.error.message}
            actionLabel="Retry"
            onAction={logsQuery.reload}
          />
        )}
        {!logsQuery.isLoading && !logsQuery.error && (logsQuery.data?.length ?? 0) === 0 && (
          <ApiState title="No security logs yet" message="Recent security events will appear here." />
        )}
        {!logsQuery.isLoading && !logsQuery.error && (logsQuery.data?.length ?? 0) > 0 && (
          <View style={{ gap: 8 }}>
            {logsQuery.data?.map((entry) => (
              <View key={entry.id} style={[styles.logRow, { borderColor: t.border }]}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>{entry.event_type.replace(/_/g, ' ')}</Text>
                <Text style={[typography.micro, { color: t.ink3 }]}>
                  {new Date(entry.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={[styles.securityNote, { backgroundColor: t.brandSoft, borderColor: `${t.brand}30` }]}>
        <IconShield size={15} color={t.brand} />
        <Text style={[typography.micro, { color: t.ink2, flex: 1, marginLeft: 9, lineHeight: 18 }]}>
          Your health data deserves extra protection. We never print or persist MFA secrets in app logs.
        </Text>
      </View>

      <SectionHeader title="Recovery" />
      <Card tight style={styles.sectionCard}>
        <SettingRow
          Icon={IconAlert}
          iconColor="#0F8F7E"
          label="Recovery email"
          value={user?.email ?? 'Not set'}
          onPress={() => showUnavailable('Recovery email changes are not available in the native app yet.')}
        />
        <SettingRow
          Icon={IconLock}
          label="Recovery phone"
          value="Not set"
          onPress={() => showUnavailable('Recovery phone setup is not available in the native app yet.')}
        />
        <SettingRow
          Icon={IconShield}
          iconColor={t.ink3}
          label="Recovery codes"
          badge={{ label: latestRecoveryCodes ? 'READY' : 'GENERATE', color: t.brand, bg: t.brandSoft }}
          last
          onPress={mfaEnabled ? pointToMfaControls : startMfaSetup}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusHero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  statusIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionCard: { marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 0 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingText: { flex: 1, minWidth: 0 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, padding: 13, borderRadius: 12, borderWidth: 1, marginTop: 10 },
  mfaCard: { marginHorizontal: 16, gap: 10 },
  mfaButtonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  halfButton: { flexGrow: 1, minWidth: 140 },
  fullButton: { width: '100%' },
  secretBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  qr: { width: 170, height: 170, alignSelf: 'center', marginTop: 8 },
  recoveryCard: { marginHorizontal: 16, marginTop: 8 },
  logsCard: { marginHorizontal: 16, marginTop: 8 },
  logRow: { borderWidth: 1, borderRadius: 10, padding: 10 },
});
