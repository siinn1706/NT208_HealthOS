import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { ChevronLeft } from '../../icons';
import { medicationService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { ApiState } from '../api/ApiState';

const FREQ_OPTIONS = ['Once daily', 'Twice daily', '3x daily', 'As needed'];

export interface MedFormState {
  name: string;
  dosage: string;
  frequency: number;
  startDate: string;
  notes: string;
  prescriber: string;
}

const EMPTY: MedFormState = { name: '', dosage: '', frequency: 0, startDate: '', notes: '', prescriber: '' };

interface AddMedicationScreenProps {
  initialValues?: Partial<MedFormState>;
  screenTitle?: string;
  onSave?: (values: MedFormState) => Promise<void> | void;
}

export function AddMedicationScreen({ initialValues, screenTitle = 'Add medication', onSave }: AddMedicationScreenProps) {
  const t = useTheme();
  const [form, setForm] = useState<MedFormState>({ ...EMPTY, ...initialValues });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof MedFormState, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }));
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
      router.back();
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
          title={screenTitle}
          left={<IconButton icon={<ChevronLeft size={22} color={t.ink} />} onPress={() => router.back()} accessibilityLabel="Back" />}
          right={
            <Pressable onPress={handleSave} hitSlop={8} disabled={saveDisabled}>
              <Text style={[typography.bodyMed, { color: saveDisabled ? t.ink4 : t.brand }]}>Save</Text>
            </Pressable>
          }
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        {error && <ApiState title="Medication not saved" message={error} />}

        <Text style={[typography.micro, s.label, { color: t.ink3 }]}>MEDICATION NAME</Text>
        <TextInput
          value={form.name}
          onChangeText={v => set('name', v)}
          placeholder="e.g. Metformin"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.ink3 }]}>DOSAGE</Text>
        <TextInput
          value={form.dosage}
          onChangeText={v => set('dosage', v)}
          placeholder="e.g. 500 mg"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.ink3 }]}>FREQUENCY</Text>
        <View style={s.chipRow}>
          {FREQ_OPTIONS.map((opt, i) => {
            const active = form.frequency === i;
            return (
              <Pressable
                key={opt}
                onPress={() => set('frequency', i)}
                style={[
                  s.chip,
                  { borderRadius: t.radius.pill, borderColor: active ? t.brand : t.border },
                  { backgroundColor: active ? t.brandSoft : t.card },
                ]}
              >
                <Text style={[typography.caption, { color: active ? t.brand : t.ink2 }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.micro, s.label, { color: t.ink3 }]}>START DATE</Text>
        <TextInput
          value={form.startDate}
          onChangeText={v => set('startDate', v)}
          placeholder="e.g. 2024-01-15"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.ink3 }]}>PRESCRIBED BY (OPTIONAL)</Text>
        <TextInput
          value={form.prescriber}
          onChangeText={v => set('prescriber', v)}
          placeholder="Doctor name"
          placeholderTextColor={t.ink4}
          style={inputStyle}
        />

        <Text style={[typography.micro, s.label, { color: t.ink3 }]}>NOTES (OPTIONAL)</Text>
        <TextInput
          value={form.notes}
          onChangeText={v => set('notes', v)}
          placeholder="e.g. Take with food"
          placeholderTextColor={t.ink4}
          multiline
          numberOfLines={3}
          style={[inputStyle, s.multiline]}
        />

        <Button label={saving ? 'Saving...' : 'Save medication'} variant="solid" onPress={saveDisabled ? undefined : handleSave} style={[{ marginTop: 8 }, saveDisabled && { opacity: 0.4 }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function toMedicationCreateBody(form: MedFormState) {
  const doseTimes = [['08:00'], ['08:00', '20:00'], ['08:00', '14:00', '20:00'], ['08:00']][form.frequency] ?? ['08:00'];
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
  safe:     { flex: 1 },
  flex:     { flex: 1 },
  bar:      { paddingHorizontal: 16 },
  content:  { paddingHorizontal: 16, paddingTop: 4 },
  label:    { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  input:    { paddingHorizontal: 14, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 14 },
  multiline:{ height: 80, textAlignVertical: 'top', paddingTop: 12 },
  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
});
