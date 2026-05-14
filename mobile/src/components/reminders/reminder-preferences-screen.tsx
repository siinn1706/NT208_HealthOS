import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { withOpacity } from '../../utils/color-mix';
import { Screen } from '../layout/Screen';
import { ApiState } from '../api/ApiState';
import { Toggle } from '../primitives/Toggle';
import { Button } from '../primitives/Button';
import { QuietHoursRing } from './quiet-hours-ring';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import {
  ChevronLeft,
  IconBell, IconCalendar, IconHeart, IconActivity, IconTarget,
  IconStethoscope, IconAlert,
} from '../../icons';

// ─── row configs ─────────────────────────────────────────────────────────────

type RowConfig = {
  key: string;
  label: string;
  sub: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  critical?: boolean;
};

const CAT_ROWS: RowConfig[] = [
  { key: 'med',      label: 'Medication reminders', sub: 'Push, sound, lock screen',     Icon: IconBell },
  { key: 'appt',     label: 'Appointments',          sub: 'Push · 1d, 1h, 15m',           Icon: IconCalendar },
  { key: 'vitals',   label: 'Vitals checks',         sub: 'Push · weekdays',               Icon: IconHeart },
  { key: 'care',     label: 'Care team messages',    sub: 'Push, sound · always',          Icon: IconStethoscope, critical: true },
  { key: 'goal',     label: 'Goals & streaks',       sub: 'Push · weekly summary',         Icon: IconTarget },
  { key: 'activity', label: 'Activity nudges',       sub: 'Off',                           Icon: IconActivity },
];

const CHANNEL_ROWS: RowConfig[] = [
  { key: 'push',    label: 'Push',     sub: 'Lock screen + banners', Icon: IconBell },
  { key: 'sound',   label: 'Sound',    sub: 'Default · soft tone',   Icon: IconAlert },
  { key: 'haptics', label: 'Haptics',  sub: 'Subtle vibration',      Icon: IconHeart },
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── sub-components ───────────────────────────────────────────────────────────

function GroupLabel({ text }: { text: string }) {
  const t = useTheme();
  return (
    <Text style={[s.groupLabel, { color: t.ink, paddingHorizontal: 20 }]}>{text}</Text>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={[s.groupCard, { backgroundColor: t.card, borderColor: t.border, marginHorizontal: 20 }]}>
      {children}
    </View>
  );
}

function PrefRow({
  row,
  value,
  masterEnabled,
  onToggle,
}: {
  row: RowConfig;
  value: boolean;
  masterEnabled: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  const iconBg = withOpacity(t.brand, 0.14);
  return (
    <View style={s.prefRow}>
      <View style={[s.rowIconCell, { backgroundColor: iconBg }]}>
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

function DayChipRow({
  activeDays,
  onToggleDay,
  disabled,
}: {
  activeDays: boolean[];
  onToggleDay: (i: number) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={s.dayChipRow}>
      {DAY_LABELS.map((label, i) => {
        const active = activeDays[i];
        return (
          <TouchableOpacity
            key={i}
            onPress={() => !disabled && onToggleDay(i)}
            style={[
              s.dayChip,
              {
                backgroundColor: active ? t.brand : t.chip,
                opacity: disabled ? 0.45 : 1,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active, disabled: !!disabled }}
            accessibilityLabel={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}
          >
            <Text style={[s.dayChipText, { color: active ? '#fff' : t.ink3 }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function OffHero({ onEnable }: { onEnable: () => void }) {
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

// ─── main screen ─────────────────────────────────────────────────────────────

export function ReminderPreferencesScreen() {
  const t = useTheme();

  const loadPreferences = useCallback(() => notificationService.preferences(), []);
  const preferences = useApiQuery(queryKeys.notificationPreferences, loadPreferences);

  const [master,       setMaster]       = useState(true);
  const [cats,         setCats]         = useState<Record<string, boolean>>(
    Object.fromEntries(CAT_ROWS.map((r) => [r.key, true])),
  );
  const [channels,     setChannels]     = useState<Record<string, boolean>>(
    { push: true, sound: true, haptics: true },
  );
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [quietStart,   setQuietStart]   = useState('22:00');
  const [quietEnd,     setQuietEnd]     = useState('07:00');
  // Mon–Sun, all active by default for quiet schedule
  const [quietDays,    setQuietDays]    = useState([true, true, true, true, true, true, true]);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!preferences.data) return;
    setMaster(preferences.data.enabled);
    setCats(preferences.data.categories);
    setChannels(preferences.data.channels);
    if (preferences.data.quiet_hours) {
      setQuietStart(preferences.data.quiet_hours.start ?? '22:00');
      setQuietEnd(preferences.data.quiet_hours.end ?? '07:00');
    }
  }, [preferences.data]);

  function toggleCat(key: string) { setCats((p) => ({ ...p, [key]: !p[key] })); }
  function toggleChannel(key: string) { setChannels((p) => ({ ...p, [key]: !p[key] })); }
  function toggleQuietDay(i: number) { setQuietDays((d) => d.map((v, idx) => idx === i ? !v : v)); }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await notificationService.updatePreferences({
        enabled:     master,
        categories:  cats as { med: boolean; appt: boolean; vitals: boolean; activity: boolean; goal: boolean },
        channels:    channels as { push: boolean; sound: boolean; haptics: boolean },
        quiet_hours: { start: quietStart, end: quietEnd },
      });
      invalidateApiQuery('notifications.');
      await preferences.reload();
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  }

  if (preferences.isLoading && !preferences.data) {
    return <Screen><ApiState title="Loading preferences" loading /></Screen>;
  }
  if (preferences.error && !preferences.data) {
    return (
      <Screen>
        <ApiState
          title="Preferences unavailable"
          message={preferences.error.message}
          actionLabel="Retry"
          onAction={preferences.reload}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      {/* Back bar */}
      <View style={[s.backBar, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[s.backTitle, { color: t.ink }]}>Notifications</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Master permission card */}
        <View style={[s.masterCard, { backgroundColor: t.brandSoft, borderColor: withOpacity(t.brand, 0.25), marginHorizontal: 20 }]}>
          <View style={[s.masterIconCell, { backgroundColor: t.brand }]}>
            <IconBell size={22} color="#fff" />
          </View>
          <View style={s.masterText}>
            <Text style={[s.masterLabel, { color: t.ink }]}>Allow notifications</Text>
            <Text style={[s.masterSub, { color: t.ink3 }]}>System permission · granted</Text>
          </View>
          <Toggle value={master} onChange={setMaster} />
        </View>

        {/* Off-state hero */}
        {!master && <OffHero onEnable={() => setMaster(true)} />}

        {/* Categories */}
        <GroupLabel text="Categories" />
        <GroupCard>
          {CAT_ROWS.map((row, i) => (
            <View key={row.key}>
              <PrefRow row={row} value={cats[row.key] ?? true} masterEnabled={master} onToggle={() => toggleCat(row.key)} />
              {i < CAT_ROWS.length - 1 && (
                <View style={[s.divider, { backgroundColor: t.border, marginLeft: 62 }]} />
              )}
            </View>
          ))}
        </GroupCard>

        {/* Quiet hours */}
        <GroupLabel text="Quiet hours" />
        <View style={[s.quietCard, { backgroundColor: t.card, borderColor: t.border, marginHorizontal: 20 }]}>
          {/* Enable row */}
          <View style={[s.prefRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
            <View style={[s.rowIconCell, { backgroundColor: withOpacity(t.brand, 0.14) }]}>
              <IconBell size={17} color={master ? t.brand : t.ink4} />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowLabel, { color: master ? t.ink : t.ink3 }]}>Enable quiet hours</Text>
              <Text style={[s.rowSub, { color: t.ink3 }]}>{quietStart}–{quietEnd}</Text>
            </View>
            <Toggle value={quietEnabled && master} onChange={setQuietEnabled} disabled={!master} />
          </View>

          {/* Ring */}
          <View style={s.ringWrap}>
            <QuietHoursRing start={quietStart} end={quietEnd} />
          </View>

          {/* Schedule days */}
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Text style={[s.rowSub, { color: t.ink3, marginBottom: 8 }]}>DAYS</Text>
            <DayChipRow activeDays={quietDays} onToggleDay={toggleQuietDay} disabled={!(quietEnabled && master)} />
          </View>
        </View>

        {/* Channels */}
        <GroupLabel text="Channels" />
        <GroupCard>
          {CHANNEL_ROWS.map((row, i) => (
            <View key={row.key}>
              <PrefRow row={row} value={channels[row.key] ?? true} masterEnabled={master} onToggle={() => toggleChannel(row.key)} />
              {i < CHANNEL_ROWS.length - 1 && (
                <View style={[s.divider, { backgroundColor: t.border, marginLeft: 62 }]} />
              )}
            </View>
          ))}
        </GroupCard>

        {saveError && (
          <View style={{ marginHorizontal: 20, marginTop: 8 }}>
            <ApiState title="Save failed" message={saveError} />
          </View>
        )}

        {/* Save + Reset */}
        <TouchableOpacity
          onPress={saving ? undefined : handleSave}
          style={[s.saveBtn, { backgroundColor: t.brand, marginHorizontal: 20 }]}
        >
          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save preferences'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.resetBtn}>
          <Text style={[s.resetBtnText, { color: t.ink3 }]}>Reset to defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  backBar:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTitle: { fontSize: 17, fontWeight: '700' },

  // master card
  masterCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  masterIconCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  masterText:     { flex: 1 },
  masterLabel:    { fontSize: 15, fontWeight: '700' },
  masterSub:      { fontSize: 12, marginTop: 2 },

  // off hero
  offHero:      { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, alignItems: 'center', gap: 8 },
  offIconTile:  { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  offHeadline:  { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  offBody:      { fontSize: 13, lineHeight: 19, textAlign: 'center' },

  // group
  groupLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  groupCard:  { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  divider:    { height: StyleSheet.hairlineWidth },

  // row
  prefRow:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowIconCell:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText:      { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel:     { fontSize: 13, fontWeight: '700' },
  rowSub:       { fontSize: 11, marginTop: 2 },

  // critical badge
  criticalBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  criticalBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // quiet hours card
  quietCard:  { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  ringWrap:   { paddingVertical: 16, alignItems: 'center' },

  // day chips
  dayChipRow: { flexDirection: 'row', gap: 6 },
  dayChip:    { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dayChipText:{ fontSize: 12, fontWeight: '700' },

  // save / reset
  saveBtn:     { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resetBtn:    { alignItems: 'center', paddingVertical: 14 },
  resetBtnText:{ fontSize: 14 },
});
