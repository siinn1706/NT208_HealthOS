import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { AddMedicationScreen, toMedicationCreateBody, type MedFormState } from './AddMedicationScreen';
import { Button } from '../primitives/Button';
import { ApiState } from '../api/ApiState';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';

export function EditMedicationScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadMedication = useCallback(() => medicationService.detail(medicationId), [medicationId]);
  const medication = useApiQuery(queryKeys.medication(medicationId), loadMedication, { enabled: Boolean(medicationId) });

  const initialValues: Partial<MedFormState> | undefined = medication.data
    ? {
        name: medication.data.name,
        dosage: medication.data.strength ?? '',
        frequency: Math.max(0, Math.min(2, (medication.data.doses?.length ?? 1) - 1)),
        startDate: medication.data.start_date,
        prescriber: medication.data.prescriber ?? '',
        notes: medication.data.notes ?? '',
      }
    : undefined;

  async function handleSave(values: MedFormState) {
    await medicationService.update(medicationId, toMedicationCreateBody(values));
    invalidateApiQuery(queryKeys.medications);
    invalidateApiQuery(queryKeys.medication(medicationId));
  }

  async function handleDelete() {
    await medicationService.archive(medicationId);
    invalidateApiQuery(queryKeys.medications);
    router.replace('/(tabs)/meds');
  }

  if (medication.isLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={s.wrap}><ApiState title="Loading medication" loading /></View>
      </SafeAreaView>
    );
  }

  if (medication.error || !medication.data) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={s.wrap}>
          <ApiState
            title="Medication unavailable"
            message={medication.error?.message ?? 'Medication not found.'}
            actionLabel="Retry"
            onAction={medication.reload}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <AddMedicationScreen
        screenTitle="Edit medication"
        initialValues={initialValues}
        onSave={handleSave}
      />

      <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border }]}>
        <Button
          label="Delete medication"
          variant="ghost"
          onPress={handleDelete}
          style={[s.deleteBtn, { borderColor: t.danger }]}
        />
        <Text style={[typography.micro, { color: t.ink4, textAlign: 'center', marginTop: 6 }]}>
          This will archive the medication and stop reminders.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  wrap:      { padding: 16 },
  footer:    { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  deleteBtn: { borderWidth: 1 },
});
