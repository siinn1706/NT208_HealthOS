import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import {
  ChevronRight, ChevronLeft, IconHeartPulse,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { useThemeContext } from '../../theme/theme-provider';
import { typography } from '../../theme/typography';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { deviceService, type ConnectedDevice, type DeviceConnectBody, type DeviceProvider } from '../../api/services/device-service';
import {
  getHealthConnectExternalAccountId,
  saveHealthConnectDeviceId,
} from '../../healthconnect/health-connect-external-account-id';
import { createHealthConnectAdapter } from '../../healthconnect/native-health-connect-adapter';
import { useHealthConnectSync } from '../../healthconnect/use-health-connect-sync';
import { HEALTH_CONNECT_PROVIDER } from '../../healthconnect/types';

const HERO_GRADIENTS: Record<string, readonly [string, string]> = {
  calm: ['#1965B3', '#3A8FD4'],
  night: ['#1A4060', '#0B2030'],
  warm: ['#8C5A2A', '#C4854A'],
};

type SourceItem = {
  id: string;
  name: string;
  sub: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  provider: DeviceProvider;
};

const ALL_SOURCES: SourceItem[] = [
  { id: 'health_connect', name: 'Health Connect', sub: 'Android aggregate health data', Icon: IconHeartPulse, color: '#1965B3', provider: 'health_connect' },
];

export function AddDeviceScreen() {
  const t = useTheme();
  const { name: themeName } = useThemeContext();
  const gradient = HERO_GRADIENTS[themeName] ?? HERO_GRADIENTS.calm;
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const healthConnectAdapter = useMemo(() => createHealthConnectAdapter(), []);
  const {
    sync: syncHealthConnectNow,
    isSyncing: syncingHealthConnect,
  } = useHealthConnectSync(healthConnectAdapter);

  const quickSource = useMemo(() => ALL_SOURCES.find((item) => item.id === 'health_connect') ?? ALL_SOURCES[0], []);

  async function connectHealthConnect(source: SourceItem): Promise<ConnectedDevice> {
    const grantedScopes = await healthConnectAdapter.getGrantedPermissions();
    if (grantedScopes.length === 0) {
      throw new Error('Health Connect permissions were not granted.');
    }

    const connected = await deviceService.connect({
      provider: source.provider,
      device_label: source.name,
      external_account_id: await getHealthConnectExternalAccountId(),
      scopes: grantedScopes,
    });

    try {
      await syncHealthConnectNow({ deviceId: connected.id });
    } catch (err) {
      await deviceService.disconnect(connected.id).catch(() => undefined);
      throw err;
    }

    await saveHealthConnectDeviceId(connected.id);
    return connected;
  }

  async function connectSource(source: SourceItem) {
    setBusySourceId(source.id);
    setActionError(null);
    try {
      const connected = source.provider === HEALTH_CONNECT_PROVIDER
        ? await connectHealthConnect(source)
        : await deviceService.connect({
          provider: source.provider,
          device_label: source.name,
        } satisfies DeviceConnectBody);
      invalidateApiQuery(queryKeys.devices);
      router.replace((`/profile/devices/${connected.id}`) as never);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not connect source.');
    } finally {
      setBusySourceId(null);
    }
  }

  return (
    <Screen>
      <TopBar
        title="Add data source"
        left={(
          <IconButton
            variant="subtle"
            icon={<ChevronLeft size={20} color={t.ink3} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        )}
      />

      <Text style={[typography.body, { color: t.ink2, marginHorizontal: 16, marginBottom: 16, lineHeight: 22 }]}>
        Connect supported Android health sources. Legacy wearable rows stay visible when Core already has them.
      </Text>

      {actionError && (
        <View style={{ marginHorizontal: 16 }}>
          <ApiState title="Could not connect source" message={actionError} />
        </View>
      )}

      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIconWrap}>
            <quickSource.Icon size={26} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, fontWeight: '700' }]}>RECOMMENDED</Text>
            <Text style={[typography.title, { color: '#FFF', marginTop: 3, fontSize: 19 }]}>{quickSource.name}</Text>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.85)', marginTop: 2 }]}>
              {quickSource.sub}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.heroBtn}
          activeOpacity={0.85}
          onPress={() => connectSource(quickSource)}
          accessibilityRole="button"
          accessibilityLabel={`Connect ${quickSource.name}`}
          disabled={busySourceId === quickSource.id}
        >
          <Text style={[typography.bodyMed, { color: gradient[0], fontWeight: '700' }]}>
            {busySourceId === quickSource.id || syncingHealthConnect ? 'Connecting…' : `Connect ${quickSource.name}`}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <SectionHeader title="All sources" />
      {ALL_SOURCES.map((source) => (
        <TouchableOpacity
          key={source.id}
          style={[styles.sourceRow, { backgroundColor: t.card, borderColor: t.border }]}
          activeOpacity={0.7}
          onPress={() => connectSource(source)}
          accessibilityRole="button"
          accessibilityLabel={`Connect ${source.name}`}
          disabled={Boolean(busySourceId)}
        >
          <View style={[styles.sourceIcon, { backgroundColor: `${source.color}18` }]}>
            <source.Icon size={20} color={source.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700' }]}>{source.name}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 1 }]}>{source.sub}</Text>
          </View>
          <Text style={[typography.micro, { color: t.ink4, marginRight: 8 }]}>
            {busySourceId === source.id ? 'Connecting…' : 'Connect'}
          </Text>
          <ChevronRight size={15} color={t.ink4} />
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  heroIconWrap: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBtn: { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1 },
  sourceIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
