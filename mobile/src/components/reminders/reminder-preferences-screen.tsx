import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/Screen';
import { Button } from '../primitives/Button';
import { ApiState } from '../api/ApiState';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { ChevronLeft, ChevronRight } from '../../icons';

type ToggleRow = { label: string; key: string };

const CAT_TOGGLES: ToggleRow[] = [
  { label: 'Medication', key: 'med' },
  { label: 'Appointments', key: 'appt' },
  { label: 'Vitals', key: 'vitals' },
  { label: 'Activity', key: 'activity' },
  { label: 'Goals', key: 'goal' },
];
const CHANNEL_TOGGLES: ToggleRow[] = [
  { label: 'Push notifications', key: 'push' },
  { label: 'Sound', key: 'sound' },
  { label: 'Haptics', key: 'haptics' },
];

export function ReminderPreferencesScreen() {
  const t = useTheme();
  const loadPreferences = useCallback(() => notificationService.preferences(), []);
  const preferences = useApiQuery(queryKeys.notificationPreferences, loadPreferences);
  const [master, setMaster] = useState(true);
  const [cats, setCats] = useState<Record<string, boolean>>({ med: true, appt: true, vitals: true, activity: true, goal: true });
  const [channels, setChannels] = useState<Record<string, boolean>>({ push: true, sound: true, haptics: false });
  const [quietHours, setQuietHours] = useState({ start: '22:00', end: '07:00' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!preferences.data) return;
    setMaster(preferences.data.enabled);
    setCats(preferences.data.categories);
    setChannels(preferences.data.channels);
    setQuietHours(preferences.data.quiet_hours);
  }, [preferences.data]);

  function toggle(map: Record<string, boolean>, key: string, set: (v: Record<string, boolean>) => void) {
    set({ ...map, [key]: !map[key] });
  }

  function SectionLabel({ label }: { label: string }) {
    return <Text style={[typography.body, { color: t.ink3, fontWeight: '600', marginHorizontal: 16, marginTop: 20, marginBottom: 8 }]}>{label.toUpperCase()}</Text>;
  }

  function ToggleItem({ row, value, onChange }: { row: ToggleRow; value: boolean; onChange: () => void }) {
    return (
      <View style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[typography.bodyMed, { color: master ? t.ink : t.ink3, flex: 1 }]}>{row.label}</Text>
        <Switch value={value && master} onValueChange={onChange} disabled={!master} trackColor={{ true: t.brand, false: t.border }} thumbColor="#FFF" />
      </View>
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await notificationService.updatePreferences({
        enabled: master,
        categories: cats as {
          med: boolean;
          appt: boolean;
          vitals: boolean;
          activity: boolean;
          goal: boolean;
        },
        channels: channels as { push: boolean; sound: boolean; haptics: boolean },
        quiet_hours: quietHours,
      });
      invalidateApiQuery('notifications.');
      await preferences.reload();
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  }

  if (preferences.isLoading && !preferences.data) {
    return (
      <Screen>
        <ApiState title="Loading preferences" loading />
      </Screen>
    );
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
    <Screen>
      <View style={styles.backBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>Notification Preferences</Text>
        </TouchableOpacity>
      </View>

      {/* Master toggle */}
      <View style={[styles.masterRow, { backgroundColor: master ? `${t.brand}15` : t.card, borderColor: master ? `${t.brand}40` : t.border }]}>
        <View>
          <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]}>Enable Notifications</Text>
          <Text style={[typography.body, { color: t.ink3 }]}>Receive health reminders</Text>
        </View>
        <Switch value={master} onValueChange={setMaster} trackColor={{ true: t.brand, false: t.border }} thumbColor="#FFF" />
      </View>

      <SectionLabel label="By Category" />
      {CAT_TOGGLES.map((row) => (
        <ToggleItem key={row.key} row={row} value={cats[row.key]} onChange={() => toggle(cats, row.key, setCats)} />
      ))}

      <SectionLabel label="Channels" />
      {CHANNEL_TOGGLES.map((row) => (
        <ToggleItem key={row.key} row={row} value={channels[row.key]} onChange={() => toggle(channels, row.key, setChannels)} />
      ))}

      <SectionLabel label="Quiet Hours" />
      {[{ label: 'Start time', val: quietHours.start }, { label: 'End time', val: quietHours.end }].map((item) => (
        <TouchableOpacity key={item.label} style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]} disabled={!master}>
          <Text style={[typography.bodyMed, { color: master ? t.ink : t.ink3, flex: 1 }]}>{item.label}</Text>
          <Text style={[typography.bodyMed, { color: master ? t.brand : t.ink3 }]}>{item.val}</Text>
          <ChevronRight size={16} color={t.ink3} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      ))}

      {saveError && (
        <View style={styles.errorWrap}>
          <ApiState title="Save failed" message={saveError} />
        </View>
      )}

      <View style={styles.footer}>
        <Button
          label={saving ? 'Saving...' : 'Save preferences'}
          variant="solid"
          onPress={saving ? undefined : handleSave}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:   { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:   { flexDirection: 'row', alignItems: 'center' },
  masterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 16, borderRadius: 14, borderWidth: 1 },
  row:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorWrap: { marginHorizontal: 16, marginTop: 8 },
  footer:    { marginHorizontal: 16, marginTop: 12, marginBottom: 16 },
});
