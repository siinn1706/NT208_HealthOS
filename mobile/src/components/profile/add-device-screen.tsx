import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import {
  ChevronRight, ChevronLeft, IconActivity, IconHeart,
  IconHeartPulse,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { useThemeContext } from '../../theme/theme-provider';
import { typography } from '../../theme/typography';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { deviceService, type DeviceConnectBody, type DeviceProvider } from '../../api/services/device-service';
import {
  getHealthConnectExternalAccountId,
  saveHealthConnectDeviceId,
} from '../../healthconnect/health-connect-external-account-id';
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
  provider?: DeviceProvider;
};

const ALL_SOURCES: SourceItem[] = [
  { id: 'health_connect', name: 'Health Connect', sub: 'Android aggregate health data', Icon: IconHeartPulse, color: '#1965B3', provider: 'health_connect' },
  { id: 'google', name: 'Google Fit', sub: 'Steps · Sleep · Heart rate', Icon: IconActivity, color: '#0284C7', provider: 'google_fit' },
  { id: 'apple', name: 'Apple Health', sub: 'iOS health metrics and vitals', Icon: IconHeart, color: '#EF4444', provider: 'apple_health' },
  { id: 'garmin', name: 'Garmin Connect', sub: 'GPS run data · Heart rate · VO2max', Icon: IconActivity, color: '#059669', provider: 'garmin' },
  { id: 'fitbit', name: 'Fitbit', sub: 'Activity and wearable insights', Icon: IconActivity, color: '#0F8F7E', provider: 'fitbit' },
  { id: 'samsung', name: 'Samsung Health', sub: 'Not yet supported in current mobile flow', Icon: IconActivity, color: '#1428A0' },
];

export function AddDeviceScreen() {
  const t = useTheme();
  const { name: themeName } = useThemeContext();
  const gradient = HERO_GRADIENTS[themeName] ?? HERO_GRADIENTS.calm;
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [missingOpen, setMissingOpen] = useState(false);
  const [missingTitle, setMissingTitle] = useState('');

  const quickSource = useMemo(() => ALL_SOURCES.find((item) => item.id === 'health_connect') ?? ALL_SOURCES[0], []);

  async function connectSource(source: SourceItem) {
    if (!source.provider) {
      setMissingTitle(`${source.name} is not yet available`);
      setMissingOpen(true);
      return;
    }
    setBusySourceId(source.id);
    setActionError(null);
    try {
      const body: DeviceConnectBody = {
        provider: source.provider,
        device_label: source.name,
      };
      if (source.provider === HEALTH_CONNECT_PROVIDER) {
        body.external_account_id = await getHealthConnectExternalAccountId();
      }
      const connected = await deviceService.connect(body);
      if (source.provider === HEALTH_CONNECT_PROVIDER) {
        await saveHealthConnectDeviceId(connected.id);
      }
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
        Connect HealthOS to your existing health apps and devices to sync data automatically.
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
            {busySourceId === quickSource.id ? 'Connecting…' : `Connect ${quickSource.name}`}
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

      <Modal visible={missingOpen} transparent animationType="fade" onRequestClose={() => setMissingOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMissingOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <ApiState title={missingTitle} message="This source is not yet mapped to a mobile connect flow." />
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
  heroCard: { marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  heroIconWrap: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBtn: { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1 },
  sourceIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet: { width: '100%', padding: 20 },
  modalClose: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
