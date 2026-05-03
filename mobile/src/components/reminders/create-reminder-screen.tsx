import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/Screen';
import { Button } from '../primitives/Button';
import { ChevronLeft } from '../../icons';
import { ApiState } from '../api/ApiState';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { reminderService } from '../../api/services';

const CATEGORIES = [
  { id: 'med', label: 'Medication' },
  { id: 'appt', label: 'Appointment' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'activity', label: 'Activity' },
  { id: 'goal', label: 'Goal' },
];
const REPEATS = ['Daily', 'Weekly', 'Custom'];
const SNOOZE_OPTS = ['5 min', '10 min', '30 min'];

export function CreateReminderScreen() {
  const t = useTheme();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('med');
  const [repeat, setRepeat] = useState('Daily');
  const [snooze, setSnooze] = useState('10 min');
  const [critical, setCritical] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await reminderService.create({
        type: toReminderType(category),
        title: title.trim(),
        time: '08:00',
        repeat: toRepeat(repeat),
        note: `Snooze ${snooze}${critical ? ' · critical' : ''}`,
      });
      invalidateApiQuery('reminders.');
      invalidateApiQuery(queryKeys.unreadNotifications);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create reminder.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.backBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>New Reminder</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {error && <ApiState title="Reminder create failed" message={error} />}
        {/* Title */}
        <Text style={[typography.body, { color: t.ink3, marginBottom: 6 }]}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Take Metformin"
          placeholderTextColor={t.ink3}
          style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.ink }]}
        />

        {/* Category */}
        <Text style={[typography.body, { color: t.ink3, marginBottom: 6, marginTop: 20 }]}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategory(c.id)}
              style={[styles.chip, { backgroundColor: category === c.id ? t.brand : t.bgElev, borderColor: category === c.id ? t.brand : t.border }]}
            >
              <Text style={[typography.micro, { color: category === c.id ? '#FFF' : t.ink3, fontWeight: '600' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time */}
        <Text style={[typography.body, { color: t.ink3, marginBottom: 6, marginTop: 20 }]}>Time</Text>
        <View style={[styles.timeRow, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]}>08:00 AM</Text>
          <Text style={[typography.body, { color: t.brand }]}>Change</Text>
        </View>

        {/* Repeat */}
        <Text style={[typography.body, { color: t.ink3, marginBottom: 6, marginTop: 20 }]}>Repeat</Text>
        <View style={[styles.segmented, { backgroundColor: t.bgElev }]}>
          {REPEATS.map((r) => (
            <TouchableOpacity key={r} onPress={() => setRepeat(r)} style={[styles.segTab, repeat === r && { backgroundColor: t.card }]}>
              <Text style={[typography.body, { color: repeat === r ? t.ink : t.ink3, fontWeight: repeat === r ? '600' : '400' }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Snooze */}
        <Text style={[typography.body, { color: t.ink3, marginBottom: 6, marginTop: 20 }]}>Snooze options</Text>
        <View style={styles.chipRow}>
          {SNOOZE_OPTS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSnooze(s)}
              style={[styles.chip, { backgroundColor: snooze === s ? `${t.brand}15` : t.bgElev, borderColor: snooze === s ? t.brand : t.border }]}
            >
              <Text style={[typography.micro, { color: snooze === s ? t.brand : t.ink3, fontWeight: '600' }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Critical */}
        <View style={[styles.criticalRow, { backgroundColor: t.card, borderColor: t.border }]}>
          <View>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]}>Critical reminder</Text>
            <Text style={[typography.body, { color: t.ink3 }]}>Bypass quiet hours</Text>
          </View>
          <Switch value={critical} onValueChange={setCritical} trackColor={{ true: t.brand, false: t.border }} thumbColor="#FFF" />
        </View>
      </View>

      <View style={styles.footer}>
        <Button label={saving ? 'Saving...' : 'Save Reminder'} variant="solid" onPress={saving ? undefined : handleSave} />
      </View>
    </Screen>
  );
}

function toReminderType(value: string): 'medicine' | 'appointment' | 'exercise' {
  if (value === 'med') return 'medicine';
  if (value === 'appt') return 'appointment';
  return 'exercise';
}

function toRepeat(value: string): 'once' | 'daily' | 'weekly' | 'monthly' {
  if (value === 'Daily') return 'daily';
  if (value === 'Weekly') return 'weekly';
  return 'once';
}

const styles = StyleSheet.create({
  backBar:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { flexDirection: 'row', alignItems: 'center' },
  form:        { paddingHorizontal: 16 },
  input:       { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  timeRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1 },
  segmented:   { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segTab:      { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  criticalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 20 },
  footer:      { paddingHorizontal: 16, paddingTop: 24 },
});
