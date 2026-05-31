import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { Toggle } from '../primitives/toggle';
import { SegmentedControl } from '../primitives/input/segmented-control';
import { ChevronLeft, IconCamera, IconSearch, IconBell } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { ApiState } from '../api/api-state';

export const FREQ_OPTIONS = ['1×', '2×', '3×', 'PRN'];
const TAKE_WITH_OPTIONS = ['Water', 'Food', 'Milk', 'Empty stomach'];

export interface MedFormState {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  notes: string;
  prescriber: string;
  takeWith: string[];
  reminderEnabled: boolean;
}

const EMPTY: MedFormState = {
  name: '',
  dosage: '',
  frequency: FREQ_OPTIONS[0],
  startDate: '',
  notes: '',
  prescriber: '',
  takeWith: [],
  reminderEnabled: true,
};

interface AddMedicationScreenProps {
  initialValues?: Partial<MedFormState>;
  screenTitle?: string;
  onSave?: (values: MedFormState) => Promise<void> | void;
}

export function AddMedicationScreen({ initialValues, screenTitle, onSave }: AddMedicationScreenProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [form, setForm] = useState<MedFormState>({ ...EMPTY, ...initialValues });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickAddMessage, setQuickAddMessage] = useState<string | null>(null);

  function set<K extends keyof MedFormState>(key: K, value: MedFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleTakeWith(opt: string) {
    setForm(prev => ({
      ...prev,
      takeWith: prev.takeWith.includes(opt)
        ? prev.takeWith.filter(v => v !== opt)
        : [...prev.takeWith, opt],
    }));
  }

  function validateMedicationForm(): string | null {
    if (!form.name.trim()) return 'Medication name is required.';
    return null;
  }

  async function handleSave() {
    const validationError = validateMedicationForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (onSave) {
        await onSave(form);
      } else {
        await medicationService.create(toMedicationCreateBody(form));
      }
      invalidateApiQuery(queryKeys.medications);
      if (onSave) {
        router.back();
      } else {
        router.replace('/meds' as never);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save medication.');
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled = saving || !form.name.trim();
  const inputStyle = [s.input, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.md, color: t.ink }];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={screenTitle ?? i18n('meds.addMedication')}
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel={i18n('common.back')} />}
          right={
            <Pressable onPress={handleSave} hitSlop={8} disabled={saveDisabled}>
              <Text style={[typography.bodyMed, { color: saveDisabled ? t.ink4 : t.brand }]}>{i18n('common.save')}</Text>
            </Pressable>
          }
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {error && <ApiState title="Medication not saved" message={error} />}

        {/* Quick-add tiles — scan or search */}
        <View style={s.tileRow}>
          {[
            {
              Icon: IconCamera,
              label: 'Scan barcode',
              message: 'Medication barcode scan is unavailable until a verified drug lookup API exists. Enter details manually.',
            },
            {
              Icon: IconSearch,
              label: 'Search database',
              message: 'Medication database search is unavailable until a verified drug lookup API exists. Enter details manually.',
            },
          ].map(({ Icon, label, message }) => (
            <Pressable
              key={label}
              onPress={() => setQuickAddMessage(message)}
              style={[s.tile, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.xl }]}
            >
              <Icon size={22} color={t.brand} />
              <Text style={[typography.caption, { color: t.ink2, marginTop: 6 }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {quickAddMessage && <ApiState title="Medication lookup unavailable" message={quickAddMessage} />}

        <Text style={[typography.micro, s.label, { color: t.brand }]}>MEDICATION NAME</Text>
        <TextInput
          value={form.name}
          onChangeText={v => set('name', v)}
          placeholder="e.g. Metformin"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.brand }]}>DOSAGE</Text>
        <TextInput
          value={form.dosage}
          onChangeText={v => set('dosage', v)}
          placeholder="e.g. 500 mg"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.brand }]}>FREQUENCY</Text>
        <SegmentedControl
          options={FREQ_OPTIONS}
          value={form.frequency}
          onChange={v => set('frequency', v)}
        />

        <Text style={[typography.micro, s.label, { color: t.brand }]}>TAKE WITH</Text>
        <View style={s.pillRow}>
          {TAKE_WITH_OPTIONS.map(opt => {
            const active = form.takeWith.includes(opt);
            return (
              <Pressable
                key={opt}
                onPress={() => toggleTakeWith(opt)}
                style={[
                  s.pill,
                  {
                    borderRadius: t.radius.pill,
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? t.brandSoft : t.card,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: active ? t.brand : t.ink2 }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.micro, s.label, { color: t.brand }]}>START DATE</Text>
        <TextInput
          value={form.startDate}
          onChangeText={v => set('startDate', v)}
          placeholder="e.g. 2024-01-15"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.brand }]}>PRESCRIBED BY (OPTIONAL)</Text>
        <TextInput
          value={form.prescriber}
          onChangeText={v => set('prescriber', v)}
          placeholder="Doctor name"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.brand }]}>NOTES (OPTIONAL)</Text>
        <TextInput
          value={form.notes}
          onChangeText={v => set('notes', v)}
          placeholder="e.g. Take with food"
          placeholderTextColor={t.ink4}
          multiline
          numberOfLines={3}
          style={[inputStyle, s.multiline]}
        />

        {/* Reminder toggle — pale brandSoft capsule */}
        <View style={[s.reminderRow, { backgroundColor: t.brandSoft, borderRadius: t.radius.xxl }]}>
          <View style={[s.reminderIcon, { backgroundColor: `${t.brand}1A`, borderRadius: t.radius.md }]}>
            <IconBell size={18} color={t.brand} />
          </View>
          <Text style={[typography.bodyMed, s.flex, { color: t.ink }]}>Remind me to take</Text>
          <Toggle value={form.reminderEnabled} onChange={v => set('reminderEnabled', v)} />
        </View>

        <Button
          label={saving ? i18n('meds.saving') : i18n('meds.addMedication')}
          variant="solid"
          onPress={saveDisabled ? undefined : handleSave}
          style={[{ marginTop: 8 }, saveDisabled && { opacity: 0.4 }]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export function toMedicationCreateBody(form: MedFormState) {
  const freqIdx = FREQ_OPTIONS.indexOf(form.frequency);
  const doseTimes = [['08:00'], ['08:00', '20:00'], ['08:00', '14:00', '20:00'], ['08:00']][freqIdx >= 0 ? freqIdx : 0] ?? ['08:00'];
  return {
    name: form.name.trim(),
    strength: form.dosage.trim() || null,
    form: 'tablet' as const,
    prescriber: form.prescriber.trim() || null,
    start_date: normalizeDate(form.startDate) ?? undefined,
    dose_times: doseTimes,
    repeat: 'daily' as const,
    notes: form.notes.trim() || null,
  };
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  flex:        { flex: 1 },
  bar:         { paddingHorizontal: 16 },
  content:     { paddingHorizontal: 16, paddingTop: 4 },
  label:       { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  input:       { paddingHorizontal: 14, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 14 },
  multiline:   { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:        { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  tileRow:     { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 4 },
  tile:        { flex: 1, alignItems: 'center', paddingVertical: 16, borderWidth: StyleSheet.hairlineWidth },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 14 },
  reminderIcon:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
