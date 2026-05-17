import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { ChevronLeft, IconBell, IconCalendar, IconHeart, IconActivity, IconTarget, IconStethoscope, IconClock } from '../../icons';
import { ApiState } from '../api/api-state';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { reminderService } from '../../api/services';

// ─── constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'med',      label: 'Medication',  Icon: IconBell },
  { id: 'appt',     label: 'Appointment', Icon: IconCalendar },
  { id: 'vitals',   label: 'Vitals',      Icon: IconHeart },
  { id: 'activity', label: 'Activity',    Icon: IconActivity },
  { id: 'goal',     label: 'Goal',        Icon: IconTarget },
  { id: 'care',     label: 'Care team',   Icon: IconStethoscope },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const REPEAT_DAYS = ['M', 'T', 'W', 'T', 'F', 'Sa', 'Su'] as const;
const REPEAT_TYPES = ['Daily', 'Weekdays', 'Custom'] as const;
const SNOOZE_OPTS  = ['5 min', '15 min', '30 min', '1 hour', 'Custom'] as const;

// ─── component ───────────────────────────────────────────────────────────────

export function CreateReminderScreen() {
  const t = useTheme();

  const [title,       setTitle]       = useState('');
  const [category,    setCategory]    = useState<CategoryId>('med');
  const [activeDays,  setActiveDays]  = useState([0, 1, 2, 3, 4]); // M–F default
  const [repeatType,  setRepeatType]  = useState('Weekdays');
  const [snooze,      setSnooze]      = useState('15 min');
  const [notes,       setNotes]       = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  function toggleDay(idx: number) {
    setActiveDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx],
    );
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await reminderService.create({
        type:   toReminderType(category),
        title:  title.trim(),
        time:   '08:00',
        repeat: toRepeat(repeatType),
        note:   [notes, `Snooze ${snooze}`, pushEnabled ? 'push:on' : 'push:off'].filter(Boolean).join(' · '),
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

  const activeCatColor = (id: CategoryId) => {
    if (id === 'activity') return t.success;
    if (id === 'goal')     return t.warning;
    return t.brand;
  };

  return (
    <Screen scroll={false} padding={false}>
      {/* Back bar with inline Save */}
      <View style={[styles.backBar, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[styles.backTitle, { color: t.ink }]}>New reminder</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saving ? undefined : handleSave}>
          <Text style={[styles.saveLink, { color: saving ? t.ink3 : t.brand }]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {error && <ApiState title="Reminder create failed" message={error} />}

        {/* Category 3×2 tile grid */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(({ id, label, Icon }) => {
            const active = category === id;
            const color  = activeCatColor(id as CategoryId);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setCategory(id as CategoryId)}
                style={[
                  styles.catTile,
                  {
                    backgroundColor: active ? `${color}14` : t.bgElev,
                    borderColor:     active ? color : t.border,
                    borderWidth:     active ? 1.5 : 1,
                  },
                ]}
              >
                <Icon size={20} color={active ? color : t.ink3} />
                <Text style={[styles.catTileLabel, { color: active ? color : t.ink3 }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Metformin 500 mg"
          placeholderTextColor={t.ink4}
          style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.ink }]}
        />

        {/* Time */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>Time</Text>
        <View style={[styles.inputRow, { backgroundColor: t.card, borderColor: t.border }]}>
          <IconClock size={16} color={t.ink3} style={{ marginRight: 10 }} />
          <Text style={[styles.inputRowText, { color: t.ink }]}>07:30</Text>
        </View>

        {/* Repeat days */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>Repeat</Text>
        <View style={styles.daysRow}>
          {REPEAT_DAYS.map((day, idx) => {
            const on = activeDays.includes(idx);
            return (
              <TouchableOpacity
                key={`${day}-${idx}`}
                onPress={() => toggleDay(idx)}
                style={[
                  styles.dayBtn,
                  {
                    backgroundColor: on ? t.brand : t.bgElev,
                    borderColor:     on ? t.brand : t.border,
                  },
                ]}
              >
                <Text style={[styles.dayBtnText, { color: on ? '#fff' : t.ink3 }]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Repeat type */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>Repeat type</Text>
        <View style={styles.repeatTypeRow}>
          {REPEAT_TYPES.map((r) => {
            const active = repeatType === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRepeatType(r)}
                style={[
                  styles.repeatTile,
                  {
                    backgroundColor: active ? t.brandSoft : t.bgElev,
                    borderColor:     active ? t.brand : t.border,
                    borderWidth:     active ? 1.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.repeatTileText, { color: active ? t.brand : t.ink3 }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Snooze options */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>Snooze options</Text>
        <View style={styles.snoozeRow}>
          {SNOOZE_OPTS.map((s) => {
            const active = snooze === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setSnooze(s)}
                style={[
                  styles.snoozeChip,
                  {
                    backgroundColor: active ? t.brandSoft : 'transparent',
                    borderColor:     active ? t.brand : t.border,
                  },
                ]}
              >
                <Text style={[styles.snoozeChipText, { color: active ? t.brand : t.ink3 }]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notes */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything to remember…"
          placeholderTextColor={t.ink4}
          multiline
          numberOfLines={3}
          style={[styles.notesInput, { backgroundColor: t.card, borderColor: t.border, color: t.ink }]}
        />

        {/* Push notification toggle row */}
        <View style={[styles.pushRow, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={[styles.pushIconCell, { backgroundColor: `${t.brand}14`, borderRadius: 10 }]}>
            <IconBell size={16} color={t.brand} />
          </View>
          <View style={styles.pushText}>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600', fontSize: 14 }]}>
              Push notification
            </Text>
            <Text style={[typography.body, { color: t.ink3, fontSize: 12 }]}>
              Banner + sound at scheduled time
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ true: t.brand, false: t.border }}
            thumbColor="#FFF"
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toReminderType(value: CategoryId): 'medicine' | 'appointment' | 'exercise' {
  if (value === 'med')      return 'medicine';
  if (value === 'appt')     return 'appointment';
  if (value === 'activity') return 'exercise';
  return 'exercise';
}

function toRepeat(value: string): 'once' | 'daily' | 'weekly' | 'monthly' {
  if (value === 'Daily' || value === 'Weekdays') return 'daily';
  if (value === 'Weekly') return 'weekly';
  return 'once';
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // back bar
  backBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTitle:   { fontSize: 17, fontWeight: '700' },
  saveLink:    { fontSize: 16, fontWeight: '600' },

  scrollContent: { paddingTop: 8 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },

  // category grid
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catTile:      { width: '30%', flexGrow: 1, aspectRatio: 1.3, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  catTileLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // inputs
  input:        { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14 },
  inputRowText: { fontSize: 15, fontWeight: '500' },

  // repeat days
  daysRow:      { flexDirection: 'row', gap: 6 },
  dayBtn:       { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayBtnText:   { fontSize: 12, fontWeight: '700' },

  // repeat type
  repeatTypeRow:  { flexDirection: 'row', gap: 8 },
  repeatTile:     { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  repeatTileText: { fontSize: 13, fontWeight: '600' },

  // snooze
  snoozeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  snoozeChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  snoozeChipText: { fontSize: 13, fontWeight: '600' },

  // notes
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },

  // push toggle
  pushRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 8 },
  pushIconCell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pushText:     { flex: 1 },
});
