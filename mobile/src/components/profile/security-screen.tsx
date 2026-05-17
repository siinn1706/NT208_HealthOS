import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { Toggle } from '../primitives/toggle';
import { MissingApiState } from '../api/api-state';
import {
  ChevronLeft, ChevronRight, IconShield, IconLock,
  IconActivity, IconRefresh, IconAlert,
} from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { useSession } from '../../auth/session-provider';

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
        <View style={[styles.settingIcon, { backgroundColor: ic + '18' }]}>
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
  const { user } = useSession();
  const [missingOpen, setMissingOpen] = useState(false);

  function openMissing() { setMissingOpen(true); }

  return (
    <Screen>
      <TopBar
        title="Security"
        left={
          <IconButton
            variant="subtle"
            icon={<ChevronLeft size={20} color={t.ink3} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      {/* Status hero — warning to enable 2FA */}
      <TouchableOpacity
        style={[styles.statusHero, { backgroundColor: t.warningSoft, borderColor: t.warning + '40' }]}
        activeOpacity={0.8}
      >
        <View style={[styles.statusIcon, { backgroundColor: t.warning }]}>
          <IconShield size={26} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyMed, { color: t.warning, fontWeight: '800', fontSize: 15 }]}>
            Recommended next step
          </Text>
          <Text style={[typography.micro, { color: t.ink2, marginTop: 2, lineHeight: 18 }]}>
            Turn on two-factor authentication to protect your health records.
          </Text>
        </View>
        <ChevronRight size={16} color={t.warning} />
      </TouchableOpacity>

      <SectionHeader title="Sign-in" />
      <Card tight style={styles.sectionCard}>
        <SettingRow
          Icon={IconLock}
          iconColor="#1965B3"
          label="Password"
          sub="Last changed 47 days ago"
          onPress={openMissing}
        />
        <SettingRow
          Icon={IconShield}
          iconColor={t.warning}
          label="Two-factor authentication"
          badge={{ label: 'OFF', color: t.warning, bg: t.warningSoft }}
          onPress={openMissing}
        />
        <SettingRow
          Icon={IconShield}
          iconColor="#7B5BB6"
          label="Face ID"
          sub="On for sign-in and sensitive screens"
          toggle={true}
        />
        <SettingRow
          Icon={IconLock}
          label="App lock"
          sub="6-digit PIN · auto-lock after 1 min"
          value="On"
          last
          onPress={openMissing}
        />
      </Card>

      <SectionHeader title="Devices & sessions" />
      <Card tight style={styles.sectionCard}>
        <SettingRow
          Icon={IconActivity}
          iconColor="#1965B3"
          label="Active sessions"
          sub={user ? 'This device' : 'No active sessions'}
          onPress={openMissing}
        />
        <SettingRow
          Icon={IconRefresh}
          iconColor={t.ink3}
          label="Recent activity"
          sub="Sign-ins, password changes, MFA events"
          last
          onPress={openMissing}
        />
      </Card>

      <SectionHeader title="Recovery" />
      <Card tight style={styles.sectionCard}>
        <SettingRow
          Icon={IconAlert}
          iconColor="#0F8F7E"
          label="Recovery email"
          value={user?.email ?? 'Not set'}
          onPress={openMissing}
        />
        <SettingRow
          Icon={IconLock}
          label="Recovery phone"
          value="Not set"
          onPress={openMissing}
        />
        <SettingRow
          Icon={IconShield}
          iconColor={t.ink3}
          label="Recovery codes"
          badge={{ label: 'GENERATE', color: t.brand, bg: t.brandSoft }}
          last
          onPress={openMissing}
        />
      </Card>

      {/* Security note */}
      <View style={[styles.securityNote, { backgroundColor: t.brandSoft, borderColor: t.brand + '30' }]}>
        <IconShield size={15} color={t.brand} />
        <Text style={[typography.micro, { color: t.ink2, flex: 1, marginLeft: 9, lineHeight: 18 }]}>
          Your health data deserves extra protection. We never send your password or codes to anyone.
        </Text>
      </View>

      {/* Coming-soon modal for unimplemented security features */}
      {missingOpen && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMissingOpen(false)}
        >
          <View style={[styles.modalSheet, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <MissingApiState title="Security feature" contract="This security feature is coming soon." />
            <TouchableOpacity
              onPress={() => setMissingOpen(false)}
              style={[styles.modalClose, { backgroundColor: t.brand, borderRadius: t.radius.pill }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[typography.bodyMed, { color: '#FFF' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusHero:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  statusIcon:   { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionCard:  { marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 0 },
  settingRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  settingIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingText:  { flex: 1, minWidth: 0 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  valueRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider:      { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, padding: 13, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet:   { width: '100%', padding: 20 },
  modalClose:   { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
});
