import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { ChevronLeft, IconBell, IconCalendar, IconActivity, IconClock } from '../../icons';
import { ApiState } from '../api/api-state';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { reminderService } from '../../api/services';

// ─── constants ───────────────────────────────────────────────────────────────

const CATEGORY_KEYS = [
  { id: 'med',      labelKey: 'categoryMed',      Icon: IconBell },
  { id: 'appt',     labelKey: 'categoryAppt',     Icon: IconCalendar },
  { id: 'activity', labelKey: 'categoryActivity', Icon: IconActivity },
] as const;

type CategoryId = typeof CATEGORY_KEYS[number]['id'];

const REPEAT_DAYS = ['M', 'T', 'W', 'T', 'F', 'Sa', 'Su'] as const;
const REPEAT_TYPES = ['Daily', 'Weekdays', 'Custom'] as const;
const REPEAT_TYPE_KEYS: Record<string, string> = {
  Daily: 'repeatDaily',
  Weekdays: 'repeatWeekdays',
  Custom: 'repeatCustom',
};

// ─── component ───────────────────────────────────────────────────────────────

export function CreateReminderScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  const [title,       setTitle]       = useState('');
  const [category,    setCategory]    = useState<CategoryId>('med');
  const [time,        setTime]        = useState('08:00');
  const [activeDays,  setActiveDays]  = useState([0, 1, 2, 3, 4]); // M–F default
  const [repeatType,  setRepeatType]  = useState('Weekdays');
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  function toggleDay(idx: number) {
    setActiveDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx],
    );
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!isValidTime(time)) { setError('Time must use HH:MM format.'); return; }
    const repeat = toRepeat(repeatType);
    const weekdayMask = repeat === 'weekly' ? toWeekdayMask(activeDays) : undefined;
    if (repeat === 'weekly' && !weekdayMask) {
      setError('Select at least one repeat day.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await reminderService.create({
        type:   toReminderType(category),
        title:  title.trim(),
        time,
        repeat,
        weekday_mask: weekdayMask,
        note: notes.trim() || null,
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
    return t.brand;
  };

  return (
    <Screen scroll={false} padding={false}>
      {/* Back bar with inline Save */}
      <View style={[styles.backBar, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[styles.backTitle, { color: t.ink }]}>{i18n('reminders.newReminder')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saving ? undefined : handleSave}>
          <Text style={[styles.saveLink, { color: saving ? t.ink3 : t.brand }]}>
            {saving ? i18n('reminders.saving') : i18n('common.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {error && <ApiState title={i18n('reminders.reminderCreateFailed')} message={error} />}

        {/* Category 3×2 tile grid */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>{i18n('reminders.fieldCategory')}</Text>
        <View style={styles.catGrid}>
          {CATEGORY_KEYS.map(({ id, labelKey, Icon }) => {
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
                  {i18n(`reminders.${labelKey}` as any)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>{i18n('reminders.fieldTitle')}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={i18n('reminders.titlePlaceholder')}
          placeholderTextColor={t.ink4}
          style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.ink }]}
        />

        {/* Time */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>{i18n('reminders.fieldTime')}</Text>
        <View style={[styles.inputRow, { backgroundColor: t.card, borderColor: t.border }]}>
          <IconClock size={16} color={t.ink3} style={{ marginRight: 10 }} />
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="08:00"
            placeholderTextColor={t.ink4}
            keyboardType="numbers-and-punctuation"
            style={[styles.timeInput, { color: t.ink }]}
          />
        </View>

        {/* Repeat days */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>{i18n('reminders.fieldRepeatType')}</Text>
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
                <Text style={[styles.repeatTileText, { color: active ? t.brand : t.ink3 }]}>
                  {i18n(`reminders.${REPEAT_TYPE_KEYS[r]}` as any)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {toRepeat(repeatType) === 'weekly' && (
          <>
            <Text style={[styles.fieldLabel, { color: t.ink3 }]}>{i18n('reminders.fieldRepeat')}</Text>
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
          </>
        )}

        {/* Notes */}
        <Text style={[styles.fieldLabel, { color: t.ink3 }]}>{i18n('reminders.fieldNotes')}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={i18n('reminders.notesPlaceholder')}
          placeholderTextColor={t.ink4}
          multiline
          numberOfLines={3}
          style={[styles.notesInput, { backgroundColor: t.card, borderColor: t.border, color: t.ink }]}
        />

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
  if (value === 'Daily') return 'daily';
  if (value === 'Weekdays' || value === 'Custom') return 'weekly';
  return 'once';
}

function toWeekdayMask(days: number[]): number {
  return days.reduce((mask, day) => mask | (1 << day), 0);
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hh, mm] = value.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // back bar
  backBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTitle:   { ...typography.h3 },
  saveLink:    { ...typography.bodyMed, fontSize: 16 },

  scrollContent: { paddingTop: 8 },
  fieldLabel:    { ...typography.caption, fontWeight: '600' as const, marginBottom: 8, marginTop: 20, textTransform: 'uppercase' as const, letterSpacing: 0.5 },

  // category grid
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catTile:      { width: '30%', flexGrow: 1, aspectRatio: 1.3, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  catTileLabel: { ...typography.micro, fontWeight: '700' as const, textAlign: 'center' as const },

  // inputs
  input:        { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14 },
  timeInput:    { flex: 1, padding: 0, fontSize: 15, fontWeight: '500' as const },

  // repeat days
  daysRow:      { flexDirection: 'row', gap: 6 },
  dayBtn:       { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayBtnText:   { ...typography.caption, fontWeight: '700' as const },

  // repeat type
  repeatTypeRow:  { flexDirection: 'row', gap: 8 },
  repeatTile:     { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  repeatTileText: { ...typography.bodyMed },

  // notes
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top' as const },
});
