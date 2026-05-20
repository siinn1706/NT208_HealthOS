import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import {
  IconPlus, IconActivity, IconHeart, IconHeartPulse,
  ChevronLeft, ChevronRight,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { queryKeys } from '../../api/queryKeys';
import { useApiQuery } from '../../api/query';
import { deviceService, type ConnectedDevice } from '../../api/services/device-service';

type SyncState = 'ok' | 'syncing' | 'failed' | 'stale' | 'inactive';

interface DeviceCardProps {
  name: string;
  sub?: string;
  syncState: SyncState;
  lastSync?: string;
  iconColor: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  onPress?: () => void;
  showArrow?: boolean;
}

function formatRelativeTime(value?: string | null) {
  if (!value) return undefined;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return undefined;
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toSyncState(device: ConnectedDevice | undefined): SyncState {
  if (!device) return 'inactive';
  switch ((device.last_sync_status ?? '').toLowerCase()) {
    case 'ok':
      return 'ok';
    case 'pending':
      return 'syncing';
    case 'permission_denied':
      return 'inactive';
    case 'partial':
      return 'stale';
    case 'error':
      return 'failed';
    default:
      return device.last_sync ? 'stale' : 'inactive';
  }
}

function SyncBadge({ state }: { state: SyncState }) {
  const t = useTheme();
  const cfg: Record<SyncState, { color: string; label: string }> = {
    ok: { color: t.success, label: 'Synced' },
    syncing: { color: t.brand, label: 'Syncing…' },
    failed: { color: t.danger, label: 'Failed' },
    stale: { color: t.warning, label: 'Stale' },
    inactive: { color: t.ink4, label: 'Inactive' },
  };
  const c = cfg[state];
  return (
    <View style={styles.syncBadge}>
      <View style={[styles.syncDot, { backgroundColor: c.color }]} />
      <Text style={[typography.micro, { color: c.color, fontWeight: '700' }]}>{c.label}</Text>
    </View>
  );
}

function DeviceRow({ name, sub, syncState, lastSync, iconColor, Icon, onPress, showArrow = true }: DeviceCardProps) {
  const t = useTheme();
  return (
    <TouchableOpacity style={styles.deviceRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.deviceIcon, { backgroundColor: `${iconColor}18` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700' }]}>{name}</Text>
        <View style={styles.deviceMeta}>
          <SyncBadge state={syncState} />
          {lastSync && <Text style={[typography.micro, { color: t.ink4 }]}>· {lastSync}</Text>}
        </View>
        {sub && <Text style={[typography.micro, { color: t.ink3, marginTop: 2 }]}>{sub}</Text>}
      </View>
      {showArrow && <ChevronRight size={16} color={t.ink4} />}
    </TouchableOpacity>
  );
}

export function DevicesHubScreen() {
  const t = useTheme();
  const [missingOpen, setMissingOpen] = useState(false);
  const [missingTitle, setMissingTitle] = useState('');
  const devicesQuery = useApiQuery(queryKeys.devices, () => deviceService.list());
  const devices = devicesQuery.data ?? [];
  const connectedCount = devices.length;

  const platformRows = useMemo(() => ([
    { id: 'apple_health', name: 'Apple Health', sub: 'iOS health data', Icon: IconHeart, color: t.success },
    { id: 'health_connect', name: 'Health Connect', sub: 'Android health data', Icon: IconHeartPulse, color: t.brand },
  ]), [t.brand, t.success]);

  function openMissing(title: string) {
    setMissingTitle(title);
    setMissingOpen(true);
  }

  return (
    <Screen>
      <TopBar
        title="Devices & health data"
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
            variant="filled"
            icon={<IconPlus size={20} color="#FFF" />}
            accessibilityLabel="Add device"
            onPress={() => router.push('/profile/devices/add' as never)}
          />
        )}
      />

      <Card style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: t.brandSoft }]}>
          <IconActivity size={24} color={t.brand} />
        </View>
        <View style={{ flex: 1 }}>
          {devicesQuery.isLoading ? (
            <ApiState title="Loading devices" loading />
          ) : devicesQuery.error ? (
            <ApiState
              title="Could not load devices"
              message={devicesQuery.error.message}
              actionLabel="Retry"
              onAction={devicesQuery.reload}
            />
          ) : (
            <>
              <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700' }]}>
                {connectedCount} connected device{connectedCount === 1 ? '' : 's'}
              </Text>
              <Text style={[typography.micro, { color: t.ink3, marginTop: 3 }]}>
                Live sync status from your connected providers
              </Text>
            </>
          )}
        </View>
      </Card>

      <SectionHeader title="Health platforms" />
      <Card tight style={styles.listCard}>
        {platformRows.map((platform, index) => {
          const connected = devices.find((item) => item.provider === platform.id);
          return (
            <React.Fragment key={platform.id}>
              <DeviceRow
                name={platform.name}
                sub={platform.sub}
                syncState={toSyncState(connected)}
                lastSync={formatRelativeTime(connected?.last_sync)}
                Icon={platform.Icon}
                iconColor={platform.color}
                onPress={() => {
                  if (connected) {
                    router.push((`/profile/devices/${connected.id}`) as never);
                    return;
                  }
                  router.push('/profile/devices/add' as never);
                }}
              />
              {index < platformRows.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
            </React.Fragment>
          );
        })}
      </Card>

      <SectionHeader title="Connected devices" />
      <Card style={styles.listCard}>
        {devicesQuery.isLoading && <ApiState title="Loading devices" loading />}
        {devicesQuery.error && (
          <ApiState
            title="Device list unavailable"
            message={devicesQuery.error.message}
            actionLabel="Retry"
            onAction={devicesQuery.reload}
          />
        )}
        {devicesQuery.isEmpty && (
          <ApiState
            title="No devices connected"
            message="Connect your first source to start syncing health data."
            actionLabel="Add device"
            onAction={() => router.push('/profile/devices/add' as never)}
          />
        )}
        {!devicesQuery.isLoading && !devicesQuery.error && devices.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {devices.map((device, index) => (
              <React.Fragment key={device.id}>
                <DeviceRow
                  name={device.name}
                  sub={device.device_label ?? device.model ?? device.provider}
                  syncState={toSyncState(device)}
                  lastSync={formatRelativeTime(device.last_sync)}
                  Icon={IconActivity}
                  iconColor={t.info}
                  onPress={() => router.push((`/profile/devices/${device.id}`) as never)}
                />
                {index < devices.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </Card>

      <SectionHeader title="Add more sources" />
      {[
        { id: 'google', name: 'Google Fit', sub: 'Android · Activity & vitals', color: t.info, action: () => router.push('/profile/devices/add' as never) },
        { id: 'garmin', name: 'Garmin Connect', sub: 'GPS watches · Running data', color: t.success, action: () => router.push('/profile/devices/add' as never) },
        { id: 'samsung', name: 'Samsung Health', sub: 'Not yet supported in mobile flow', color: t.brand, action: () => openMissing('Samsung Health integration is not yet available') },
      ].map((source) => (
        <TouchableOpacity
          key={source.id}
          style={[styles.addRow, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={source.action}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Connect ${source.name}`}
        >
          <View style={[styles.deviceIcon, { backgroundColor: `${source.color}18` }]}>
            <IconActivity size={20} color={source.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700' }]}>{source.name}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 1 }]}>{source.sub}</Text>
          </View>
          <View style={[styles.connectBtn, { borderColor: t.border }]}>
            <Text style={[typography.micro, { color: t.ink, fontWeight: '700' }]}>Connect</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Modal visible={missingOpen} transparent animationType="fade" onRequestClose={() => setMissingOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMissingOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <ApiState title={missingTitle} message="This provider is not yet available in mobile." />
            <Pressable
              onPress={() => setMissingOpen(false)}
              style={[styles.modalClose, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[typography.bodyMed, { color: '#FFF' }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 8 },
  summaryIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listCard: { marginHorizontal: 16, paddingHorizontal: 0, paddingVertical: 0 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  deviceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  deviceInfo: { flex: 1, minWidth: 0 },
  deviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 59 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1 },
  connectBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet: { width: '100%', padding: 20 },
  modalClose: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
