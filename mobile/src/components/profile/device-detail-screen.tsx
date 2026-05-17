import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { ApiState, MissingApiState } from '../api/api-state';
import {
  ChevronLeft, IconMore, IconActivity, IconAlert,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

type SyncState = 'ok' | 'failed' | 'stale' | 'syncing' | 'inactive';

const SYNC_STATE: Record<string, SyncState> = {
  'fitbit': 'failed',
  'omron': 'stale',
  'apple-health': 'ok',
};

const DEVICE_NAMES: Record<string, string> = {
  'fitbit': 'Fitbit Charge 5',
  'omron': 'Omron BP Monitor',
  'apple-health': 'Apple Health',
};

function SyncStatusRow({ state }: { state: SyncState }) {
  const t = useTheme();
  const cfg: Record<SyncState, { color: string; label: string; bg: string }> = {
    ok:       { color: t.success, label: 'Synced',    bg: t.successSoft },
    syncing:  { color: t.brand,   label: 'Syncing…',  bg: t.brandSoft },
    failed:   { color: t.danger,  label: 'Sync failed', bg: t.dangerSoft },
    stale:    { color: t.warning, label: 'Data stale', bg: t.warningSoft },
    inactive: { color: t.ink4,    label: 'Inactive',   bg: t.chip },
  };
  const c = cfg[state];
  return (
    <View style={[styles.syncRow, { backgroundColor: c.bg }]}>
      <View style={[styles.syncDot, { backgroundColor: c.color }]} />
      <Text style={[typography.bodyMed, { color: c.color, fontWeight: '700', fontSize: 13 }]}>
        {c.label}
      </Text>
    </View>
  );
}

export function DeviceDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const syncState: SyncState = SYNC_STATE[id ?? ''] ?? 'ok';
  const deviceName = DEVICE_NAMES[id ?? ''] ?? 'Device';
  const [missingOpen, setMissingOpen] = useState(false);

  return (
    <Screen>
      <TopBar
        title={deviceName}
        left={
          <IconButton
            variant="subtle"
            icon={<ChevronLeft size={20} color={t.ink3} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
        right={
          <IconButton
            variant="subtle"
            icon={<IconMore size={20} color={t.ink3} />}
            accessibilityLabel="More options"
            onPress={() => {}}
          />
        }
      />

      {/* Device hero */}
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: t.brandSoft, borderColor: t.border }]}>
            <IconActivity size={30} color={t.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.title, { color: t.ink, fontSize: 20 }]}>{deviceName}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 3 }]}>
              Bluetooth · Serial: --
            </Text>
            <SyncStatusRow state={syncState} />
          </View>
        </View>

        {syncState === 'ok' && (
          <View style={[styles.syncNote, { backgroundColor: t.successSoft, borderColor: t.success + '30' }]}>
            <Text style={[typography.micro, { color: t.ink2, lineHeight: 18 }]}>
              Last synced <Text style={{ fontWeight: '700' }}>recently</Text>
            </Text>
          </View>
        )}
        {syncState === 'failed' && (
          <View style={[styles.syncNote, { backgroundColor: t.dangerSoft, borderColor: t.danger + '30' }]}>
            <View style={styles.syncNoteRow}>
              <IconAlert size={14} color={t.danger} />
              <Text style={[typography.micro, { color: t.danger, fontWeight: '700', marginLeft: 6 }]}>
                Last sync failed
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: t.danger + '40' }]}
              activeOpacity={0.7}
              onPress={() => setMissingOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Retry sync"
            >
              <Text style={[typography.micro, { color: t.danger, fontWeight: '700' }]}>
                Retry sync
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {syncState === 'stale' && (
          <View style={[styles.syncNote, { backgroundColor: t.warningSoft, borderColor: t.warning + '30' }]}>
            <Text style={[typography.micro, { color: t.ink2, lineHeight: 18 }]}>
              Data stale · Check device is within Bluetooth range
            </Text>
          </View>
        )}
      </Card>

      {/* Latest data */}
      <SectionHeader title="Latest data" />
      <View style={styles.emptyData}>
        <ApiState title="No device data" message="Connect to see live metrics." />
      </View>

      {/* Settings section */}
      <SectionHeader title="Device settings" />
      <Card tight style={styles.settingsCard}>
        {['Sync frequency', 'Data types to sync', 'Disconnect device'].map((label, i, arr) => (
          <React.Fragment key={label}>
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setMissingOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Text style={[
                typography.bodyMed,
                { color: label === 'Disconnect device' ? t.danger : t.ink, fontWeight: '600' },
              ]}>
                {label}
              </Text>
              <ChevronLeft size={14} color={t.ink4} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
          </React.Fragment>
        ))}
      </Card>

      {/* Coming-soon modal */}
      <Modal visible={missingOpen} transparent animationType="fade" onRequestClose={() => setMissingOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMissingOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <MissingApiState title="Device sync" contract="Device sync API not yet available." />
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
  heroCard:    { marginHorizontal: 16, marginTop: 8 },
  heroRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroIcon:    { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  syncRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, alignSelf: 'flex-start' },
  syncDot:     { width: 7, height: 7, borderRadius: 4 },
  syncNote:    { marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1 },
  syncNoteRow: { flexDirection: 'row', alignItems: 'center' },
  retryBtn:    { flexDirection: 'row', alignItems: 'center', marginTop: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  emptyData:   { marginHorizontal: 16, marginBottom: 8 },
  settingsCard:{ marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 0 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:  { width: '100%', padding: 20 },
  modalClose:  { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  settingRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  divider:     { height: StyleSheet.hairlineWidth },
});
