import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { AddMedicationScreen, toMedicationCreateBody, FREQ_OPTIONS, type MedFormState } from './add-medication-screen';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';

export function EditMedicationScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medicationId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadMedication = useCallback(() => medicationService.detail(medicationId), [medicationId]);
  const medication = useApiQuery(queryKeys.medication(medicationId), loadMedication, { enabled: Boolean(medicationId) });

  const initialValues: Partial<MedFormState> | undefined = medication.data
    ? {
        name: medication.data.name,
        dosage: medication.data.strength ?? '',
        frequency: FREQ_OPTIONS[Math.max(0, Math.min(2, (medication.data.doses?.length ?? 1) - 1))] ?? FREQ_OPTIONS[0],
        startDate: medication.data.start_date,
        prescriber: medication.data.prescriber ?? '',
        notes: medication.data.notes ?? '',
      }
    : undefined;

  async function handleSave(values: MedFormState) {
    await medicationService.update(medicationId, toMedicationCreateBody(values));
    invalidateApiQuery(queryKeys.medications);
    invalidateApiQuery(queryKeys.medication(medicationId));
    invalidateApiQuery(queryKeys.medicationDosesToday);
    invalidateApiQuery(queryKeys.remindersAll);
  }

  if (medication.isLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={s.wrap}><ApiState title={i18n('api.loading')} loading /></View>
      </SafeAreaView>
    );
  }

  if (medication.error || !medication.data) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={s.wrap}>
          <ApiState
            title={i18n('api.unavailable')}
            message={medication.error?.message ?? 'Medication not found.'}
            actionLabel={i18n('common.retry')}
            onAction={medication.reload}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[s.safe, { backgroundColor: t.bg }]}>
      <AddMedicationScreen
        screenTitle={i18n('meds.editMed')}
        initialValues={initialValues}
        onSave={handleSave}
      />

      <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border }]}>
        <Button
          label={i18n('meds.pauseMedication')}
          variant="ghost"
          onPress={() => router.push(`/meds/pause/${medicationId}` as never)}
          style={[s.actionBtn, { borderColor: t.warning }]}
          labelColor={t.warning}
        />
        <Button
          label={i18n('meds.archiveMedication')}
          variant="ghost"
          onPress={() => router.push(`/meds/archive?id=${medicationId}` as never)}
          style={[s.actionBtn, { borderColor: t.danger }]}
          labelColor={t.danger}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  wrap:      { padding: 16 },
  footer:    { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: { borderWidth: 1 },
});
