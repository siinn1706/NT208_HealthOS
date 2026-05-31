import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiState } from '../api/api-state';
import { Button } from '../primitives/button';
import { Toggle } from '../primitives/toggle';
import { useTheme } from '../../theme/useTheme';
import { withOpacity } from '../../utils/color-mix';
import { IconBell } from '../../icons';
import { QuietHoursRing } from './quiet-hours-ring';
import type { ReminderPreferenceRowConfig } from './reminder-preferences-contract';

export function GroupLabel({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={[s.groupLabel, { color: t.ink, paddingHorizontal: 20 }]}>{text}</Text>;
}

export function GroupCard({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={[s.groupCard, { backgroundColor: t.card, borderColor: t.border, marginHorizontal: 20 }]}>
      {children}
    </View>
  );
}

export function PreferenceDivider() {
  const t = useTheme();
  return <View style={[s.divider, { backgroundColor: t.border, marginLeft: 62 }]} />;
}

export function PreferenceRow({
  row,
  value,
  masterEnabled,
  onToggle,
}: {
  row: ReminderPreferenceRowConfig;
  value: boolean;
  masterEnabled: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  return (
    <View style={s.prefRow}>
      <View style={[s.rowIconCell, { backgroundColor: withOpacity(t.brand, 0.14) }]}>
        <row.Icon size={17} color={masterEnabled ? t.brand : t.ink4} />
      </View>
      <View style={s.rowText}>
        <View style={s.rowTitleLine}>
          <Text style={[s.rowLabel, { color: masterEnabled ? t.ink : t.ink3 }]}>{row.label}</Text>
          {row.critical && (
            <View style={[s.criticalBadge, { backgroundColor: t.warningSoft }]}>
              <Text style={[s.criticalBadgeText, { color: t.warning }]}>CRITICAL</Text>
            </View>
          )}
        </View>
        <Text style={[s.rowSub, { color: t.ink3 }]}>{row.sub}</Text>
      </View>
      <Toggle value={value && masterEnabled} onChange={onToggle} disabled={!masterEnabled} />
    </View>
  );
}

export function MasterPermissionCard({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={[s.masterCard, { backgroundColor: t.brandSoft, borderColor: withOpacity(t.brand, 0.25), marginHorizontal: 20 }]}>
      <View style={[s.masterIconCell, { backgroundColor: t.brand }]}>
        <IconBell size={22} color="#fff" />
      </View>
      <View style={s.masterText}>
        <Text style={[s.masterLabel, { color: t.ink }]}>Allow notifications</Text>
        <Text style={[s.masterSub, { color: t.ink3 }]}>Core preference · OS permission not managed in this build</Text>
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

export function NotificationsOffHero({ onEnable }: { onEnable: () => void }) {
  const t = useTheme();
  return (
    <View style={[s.offHero, { backgroundColor: t.warningSoft, borderColor: withOpacity(t.warning, 0.3), marginHorizontal: 20 }]}>
      <View style={[s.offIconTile, { backgroundColor: t.card }]}>
        <IconBell size={28} color={t.warning} />
      </View>
      <Text style={[s.offHeadline, { color: t.ink }]}>Notifications off</Text>
      <Text style={[s.offBody, { color: t.ink3 }]}>
        You'll miss medication reminders, appointment alerts, and care team messages.
      </Text>
      <Button label="Turn on notifications" variant="solid" onPress={onEnable} style={{ marginTop: 4 }} />
    </View>
  );
}

export function QuietWindowCard({ start, end, masterEnabled }: { start: string; end: string; masterEnabled: boolean }) {
  const t = useTheme();
  return (
    <View style={[s.quietCard, { backgroundColor: t.card, borderColor: t.border, marginHorizontal: 20 }]}>
      <View style={[s.prefRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
        <View style={[s.rowIconCell, { backgroundColor: withOpacity(t.brand, 0.14) }]}>
          <IconBell size={17} color={masterEnabled ? t.brand : t.ink4} />
        </View>
        <View style={s.rowText}>
          <Text style={[s.rowLabel, { color: masterEnabled ? t.ink : t.ink3 }]}>Quiet window</Text>
          <Text style={[s.rowSub, { color: t.ink3 }]}>{start}-{end}</Text>
        </View>
      </View>
      <View style={s.ringWrap}>
        <QuietHoursRing start={start} end={end} />
      </View>
    </View>
  );
}

export function PreferenceFeedback({ error, success }: { error: string | null; success: string | null }) {
  if (error) return <View style={s.feedback}><ApiState title="Save failed" message={error} /></View>;
  if (success) return <View style={s.feedback}><ApiState title={success} message="Defaults saved to your account." /></View>;
  return null;
}

const s = StyleSheet.create({
  groupLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  groupCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  divider: { height: StyleSheet.hairlineWidth },
  prefRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowIconCell: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 13, fontWeight: '700' },
  rowSub: { fontSize: 11, marginTop: 2 },
  criticalBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  criticalBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  masterCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  masterIconCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  masterText: { flex: 1 },
  masterLabel: { fontSize: 15, fontWeight: '700' },
  masterSub: { fontSize: 12, marginTop: 2 },
  offHero: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, alignItems: 'center', gap: 8 },
  offIconTile: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  offHeadline: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  offBody: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  quietCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  ringWrap: { paddingVertical: 16, alignItems: 'center' },
  feedback: { marginHorizontal: 20, marginTop: 8 },
});
