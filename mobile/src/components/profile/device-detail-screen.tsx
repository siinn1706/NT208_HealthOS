import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import {
  ChevronLeft, IconMore, IconActivity, IconAlert,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { useApiQuery, invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { deviceService, type ConnectedDevice } from '../../api/services/device-service';
import { useHealthConnectSync } from '../../healthconnect/use-health-connect-sync';
import { createNativeHealthConnectAdapter, requestHealthConnectPermissions } from '../../healthconnect/native-adapter';

type SyncState = 'ok' | 'failed' | 'stale' | 'syncing' | 'inactive';

const HEALTH_CONNECT_SCOPES = [
  'Steps',
  'HeartRate',
  'SleepSession',
  'Weight',
  'BloodPressure',
  'ExerciseSession',
] as const;

function toSyncState(device: ConnectedDevice): SyncState {
  switch ((device.last_sync_status ?? '').toLowerCase()) {
    case 'ok':
      return 'ok';
    case 'error':
      return 'failed';
    case 'pending':
      return 'syncing';
    case 'partial':
      return 'stale';
    case 'permission_denied':
      return 'inactive';
    default:
      return device.last_sync ? 'stale' : 'inactive';
  }
}

function formatIso(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function SyncStatusRow({ state }: { state: SyncState }) {
  const t = useTheme();
  const cfg: Record<SyncState, { color: string; label: string; bg: string }> = {
    ok: { color: t.success, label: 'Synced', bg: t.successSoft },
    syncing: { color: t.brand, label: 'Syncing…', bg: t.brandSoft },
    failed: { color: t.danger, label: 'Sync failed', bg: t.dangerSoft },
    stale: { color: t.warning, label: 'Data stale', bg: t.warningSoft },
    inactive: { color: t.ink4, label: 'Permission needed', bg: t.chip },
  };
  const c = cfg[state];
  return (
    <View style={[styles.syncRow, { backgroundColor: c.bg }]}>
      <View style={[styles.syncDot, { backgroundColor: c.color }]} />
      <Text style={[typography.bodyMed, { color: c.color, fontWeight: '700', fontSize: 13 }]}>{c.label}</Text>
    </View>
  );
}

export function DeviceDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const devicesQuery = useApiQuery(queryKeys.devices, () => deviceService.list(), { enabled: Boolean(id) });
  const device = useMemo(() => devicesQuery.data?.find((item) => item.id === id) ?? null, [devicesQuery.data, id]);
  const syncStateQuery = useApiQuery(
    queryKeys.deviceSyncState(id ?? 'missing'),
    () => deviceService.getSyncState(id ?? ''),
    { enabled: Boolean(id && device) },
  );

  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncingLegacy, setSyncingLegacy] = useState(false);
  const [resettingSyncState, setResettingSyncState] = useState(false);
  const [savingScopes, setSavingScopes] = useState(false);
  const [grantingPermissions, setGrantingPermissions] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const healthConnectAdapter = useMemo(() => createNativeHealthConnectAdapter(), []);
  const {
    sync: syncHealthConnectNow,
    reset: resetHealthConnectNow,
    isSyncing: syncingHealthConnect,
  } = useHealthConnectSync(healthConnectAdapter);

  useEffect(() => {
    if (device?.scopes) setSelectedScopes(device.scopes);
    else setSelectedScopes([]);
  }, [device?.id, device?.scopes]);

  if (devicesQuery.isLoading) {
    return (
      <Screen>
        <TopBar
          title="Device detail"
          left={(
            <IconButton
              variant="subtle"
              icon={<ChevronLeft size={20} color={t.ink3} />}
              accessibilityLabel="Back"
              onPress={() => router.back()}
            />
          )}
        />
        <ApiState title="Loading device" loading />
      </Screen>
    );
  }

  if (devicesQuery.error) {
    return (
      <Screen>
        <TopBar
          title="Device detail"
          left={(
            <IconButton
              variant="subtle"
              icon={<ChevronLeft size={20} color={t.ink3} />}
              accessibilityLabel="Back"
              onPress={() => router.back()}
            />
          )}
        />
        <ApiState
          title="Could not load device"
          message={devicesQuery.error.message}
          actionLabel="Retry"
          onAction={devicesQuery.reload}
        />
      </Screen>
    );
  }

  if (!device || !id) {
    return (
      <Screen>
        <TopBar
          title="Device detail"
          left={(
            <IconButton
              variant="subtle"
              icon={<ChevronLeft size={20} color={t.ink3} />}
              accessibilityLabel="Back"
              onPress={() => router.back()}
            />
          )}
        />
        <ApiState title="Device not found" message="This connected device no longer exists." />
      </Screen>
    );
  }

  const syncState = toSyncState(device);
  const isHealthConnect = device.provider === 'health_connect';
  const syncingNow = isHealthConnect ? syncingHealthConnect : syncingLegacy;

  async function handleSync() {
    if (!isHealthConnect) setSyncingLegacy(true);
    setActionError(null);
    try {
      if (isHealthConnect) {
        await syncHealthConnectNow();
      } else {
        await deviceService.sync(id);
      }
      invalidateApiQuery(queryKeys.devices);
      invalidateApiQuery(queryKeys.device(id));
      await devicesQuery.reload();
      await syncStateQuery.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not sync device.');
    } finally {
      if (!isHealthConnect) setSyncingLegacy(false);
    }
  }

  async function handleDisconnect() {
    setDeleting(true);
    setActionError(null);
    try {
      await deviceService.disconnect(id);
      invalidateApiQuery(queryKeys.devices);
      router.back();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not disconnect device.');
      setDeleting(false);
    }
  }

  async function handleSaveScopes() {
    setSavingScopes(true);
    setActionError(null);
    try {
      await deviceService.patchPermissions(id, selectedScopes);
      invalidateApiQuery(queryKeys.devices);
      await devicesQuery.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update permissions.');
    } finally {
      setSavingScopes(false);
    }
  }

  async function handleGrantPermissions() {
    setGrantingPermissions(true);
    setActionError(null);
    try {
      await requestHealthConnectPermissions(selectedScopes);
      invalidateApiQuery(queryKeys.devices);
      await devicesQuery.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not request Health Connect permissions.');
    } finally {
      setGrantingPermissions(false);
    }
  }

  async function handleResetSyncState() {
    if (!id) return;
    const entries = syncStateQuery.data ?? [];
    if (entries.length === 0) return;
    setResettingSyncState(true);
    setActionError(null);
    try {
      if (isHealthConnect) {
        await resetHealthConnectNow({
          deviceId: id,
          recordTypes: entries.map((entry) => entry.record_type),
        });
      } else {
        const tokens = entries.reduce<Record<string, string | null>>((acc, entry) => {
          acc[entry.record_type] = null;
          return acc;
        }, {});
        await deviceService.putSyncState(id, tokens);
      }
      await syncStateQuery.reload();
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not reset sync state.');
    } finally {
      setResettingSyncState(false);
    }
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope]));
  }

  return (
    <Screen>
      <TopBar
        title={device.name}
        left={(
          <IconButton
            variant="subtle"
            icon={<ChevronLeft size={20} color={t.ink3} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        )}
        right={(
          <IconButton
            variant="subtle"
            icon={<IconMore size={20} color={t.ink3} />}
            accessibilityLabel="More options"
            onPress={() => {}}
          />
        )}
      />

      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: t.brandSoft, borderColor: t.border }]}>
            <IconActivity size={30} color={t.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: t.ink, fontSize: 20 }]}>{device.name}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 3 }]}>
              {device.provider.replace(/_/g, ' ')}{device.external_account_id ? ` · ${device.external_account_id}` : ''}
            </Text>
            <SyncStatusRow state={syncState} />
          </View>
        </View>

        <View style={[styles.syncNote, { backgroundColor: t.bgElev, borderColor: t.border }]}>
          <Text style={[typography.micro, { color: t.ink2, lineHeight: 18 }]}>
            Last synced: <Text style={{ fontWeight: '700' }}>{formatIso(device.last_sync)}</Text>
          </Text>
          <Text style={[typography.micro, { color: t.ink3, lineHeight: 18 }]}>
            Last attempted: {formatIso(device.last_attempted_at)}
          </Text>
        </View>

        <View style={styles.heroActions}>
          <Button label={syncingNow ? 'Syncing…' : 'Sync now'} variant="soft" onPress={handleSync} disabled={syncingNow || deleting} />
          <Button label={deleting ? 'Disconnecting…' : 'Disconnect'} variant="ghost" onPress={handleDisconnect} disabled={deleting || syncingNow} />
        </View>
      </Card>

      {actionError && <ApiState title="Action failed" message={actionError} />}

      <SectionHeader title="Sync state by record type" />
      <Card style={styles.sectionCard}>
        {syncStateQuery.isLoading && <ApiState title="Loading sync state" loading />}
        {syncStateQuery.error && (
          <ApiState
            title="Sync state unavailable"
            message={syncStateQuery.error.message}
            actionLabel="Retry"
            onAction={syncStateQuery.reload}
          />
        )}
        {!syncStateQuery.isLoading && !syncStateQuery.error && (syncStateQuery.data?.length ?? 0) === 0 && (
          <ApiState title="No sync-state tokens yet" message="Tokens will appear after the first successful Health Connect pull." />
        )}
        {!syncStateQuery.isLoading && !syncStateQuery.error && (syncStateQuery.data?.length ?? 0) > 0 && (
          <View style={{ padding: 4, gap: 10 }}>
            <View>
              {syncStateQuery.data?.map((entry, index) => (
                <View key={entry.record_type} style={[styles.stateRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                  <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]}>{entry.record_type}</Text>
                  <Text style={[typography.micro, { color: t.ink3 }]}>
                    failures: {entry.consecutive_failures} · last: {formatIso(entry.last_synced_at)}
                  </Text>
                </View>
              ))}
            </View>
            <Button
              label={resettingSyncState ? 'Resetting…' : 'Reset sync tokens'}
              variant="ghost"
              onPress={handleResetSyncState}
              disabled={resettingSyncState || syncingNow || deleting}
            />
          </View>
        )}
      </Card>

      <SectionHeader title="Device settings" />
      <Card tight style={styles.settingsCard}>
        {!isHealthConnect && (
          <ApiState
            title="No permission controls for this provider"
            message="Permission sync is currently available for Health Connect devices."
          />
        )}

        {isHealthConnect && (
          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 8 }]}>Data types to sync</Text>
            {HEALTH_CONNECT_SCOPES.map((scope) => {
              const selected = selectedScopes.includes(scope);
              return (
                <TouchableOpacity
                  key={scope}
                  onPress={() => toggleScope(scope)}
                  activeOpacity={0.75}
                  style={[
                    styles.scopeRow,
                    {
                      backgroundColor: selected ? t.brandSoft : t.card,
                      borderColor: selected ? `${t.brand}60` : t.border,
                    },
                  ]}
                >
                  <Text style={[typography.bodyMed, { color: selected ? t.brand : t.ink }]}>{scope}</Text>
                </TouchableOpacity>
              );
            })}
            <Button
              label={grantingPermissions ? 'Requesting…' : 'Grant Health Connect access'}
              variant="soft"
              onPress={handleGrantPermissions}
              disabled={grantingPermissions || savingScopes || deleting || selectedScopes.length === 0}
              style={{ marginTop: 12 }}
            />
            <Button
              label={savingScopes ? 'Saving…' : 'Save permissions'}
              variant="solid"
              onPress={handleSaveScopes}
              disabled={savingScopes || grantingPermissions || deleting}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </Card>

      {syncState === 'failed' && (
        <View style={[styles.alertRow, { backgroundColor: t.dangerSoft, borderColor: `${t.danger}30` }]}>
          <IconAlert size={15} color={t.danger} />
          <Text style={[typography.micro, { color: t.danger, marginLeft: 8, flex: 1 }]}>
            Last sync failed. Retry sync and confirm device permissions are still granted.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginHorizontal: 16, marginTop: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, alignSelf: 'flex-start' },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncNote: { marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1, gap: 3 },
  heroActions: { marginTop: 12, flexDirection: 'row', gap: 10 },
  sectionCard: { marginHorizontal: 16, marginBottom: 8 },
  stateRow: { paddingVertical: 10 },
  settingsCard: { marginHorizontal: 16, paddingHorizontal: 4, paddingVertical: 4 },
  scopeRow: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  alertRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
});
