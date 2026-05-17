import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { PulseDot } from '../primitives/feedback/pulse-dot';
import { MissingApiState } from '../api/api-state';
import {
  IconPlus, IconActivity, IconHeart, IconHeartPulse,
  IconDroplet, ChevronLeft, ChevronRight,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

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

function SyncBadge({ state }: { state: SyncState }) {
  const t = useTheme();
  const cfg: Record<SyncState, { color: string; label: string }> = {
    ok:       { color: t.success, label: 'Synced' },
    syncing:  { color: t.brand,   label: 'Syncing…' },
    failed:   { color: t.danger,  label: 'Failed' },
    stale:    { color: t.warning, label: 'Stale' },
    inactive: { color: t.ink4,    label: 'Inactive' },
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
      <View style={[styles.deviceIcon, { backgroundColor: iconColor + '18' }]}>
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

  function openMissing(title: string) { setMissingTitle(title); setMissingOpen(true); }

  const addableSources = [
    { id: 'google',  name: 'Google Fit',     sub: 'Android · Activity & vitals', color: t.info },
    { id: 'samsung', name: 'Samsung Health', sub: 'Galaxy Watch · Galaxy Ring',  color: t.brand },
    { id: 'garmin',  name: 'Garmin Connect', sub: 'GPS watches · Running data',  color: t.success },
  ];

  return (
    <Screen>
      <TopBar
        title="Devices & health data"
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
            variant="filled"
            icon={<IconPlus size={20} color="#FFF" />}
            accessibilityLabel="Add device"
            onPress={() => router.push('/profile/devices/add' as never)}
          />
        }
      />

      {/* Summary hero */}
      <Card style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: t.brandSoft }]}>
          <IconActivity size={24} color={t.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <MissingApiState title="Device sync status" contract="Device connection API pending — connect a device to see sync status." />
        </View>
      </Card>

      <SectionHeader title="Health platforms" />
      <Card tight style={styles.listCard}>
        <DeviceRow
          name="Apple Health"
          sub="Steps · Sleep · Heart rate · HRV"
          syncState="ok"
          lastSync="2h ago"
          Icon={IconHeart}
          iconColor={t.success}
          onPress={() => openMissing('Apple Health integration coming soon')}
        />
        <View style={[styles.divider, { backgroundColor: t.border }]} />
        <DeviceRow
          name="Manual entry"
          sub="Weight · Blood pressure · Glucose"
          syncState="ok"
          lastSync="Yesterday"
          Icon={IconHeartPulse}
          iconColor={t.brand}
          showArrow={false}
        />
      </Card>

      <SectionHeader title="Connected devices" />
      <Card style={styles.listCard}>
        <MissingApiState title="No devices connected" contract="Device management API pending — connect a device to see it here." />
      </Card>

      <SectionHeader title="Add more sources" />
      {addableSources.map((s) => (
        <TouchableOpacity
          key={s.id}
          style={[styles.addRow, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={() => openMissing(`${s.name} integration coming soon`)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Connect ${s.name}`}
        >
          <View style={[styles.deviceIcon, { backgroundColor: s.color + '18' }]}>
            <IconActivity size={20} color={s.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700' }]}>{s.name}</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 1 }]}>{s.sub}</Text>
          </View>
          <View style={[styles.connectBtn, { borderColor: t.border }]}>
            <Text style={[typography.micro, { color: t.ink, fontWeight: '700' }]}>Connect</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Coming-soon modal */}
      <Modal visible={missingOpen} transparent animationType="fade" onRequestClose={() => setMissingOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMissingOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <MissingApiState title={missingTitle} contract="not yet available" />
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
  summaryCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 8 },
  summaryIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listCard:     { marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 0 },
  deviceRow:    { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  deviceIcon:   { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  deviceInfo:   { flex: 1, minWidth: 0 },
  deviceMeta:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  syncBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  syncDot:      { width: 7, height: 7, borderRadius: 4 },
  divider:      { height: StyleSheet.hairlineWidth, marginLeft: 59 },
  addRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1 },
  connectBtn:   { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
  modalClose:   { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
