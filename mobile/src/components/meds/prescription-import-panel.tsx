import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MedicationImportResult, PrescriptionMedicine } from '../../../../shared/api-contracts';
import { appointmentService, medicationService } from '../../api/services';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ApiState } from '../api/api-state';
import { Button } from '../primitives/button';
import { Card } from '../primitives/card';
import { Checkbox } from '../primitives/input/checkbox';

export function PrescriptionImportPanel({ appointmentId }: { appointmentId: string }) {
  const t = useTheme();
  const loadAppointment = useCallback(() => appointmentService.detail(appointmentId), [appointmentId]);
  const appointment = useApiQuery(queryKeys.appointment(appointmentId), loadAppointment, { enabled: Boolean(appointmentId) });
  const prescriptionMedicines = appointment.data?.prescription?.medicines;
  const medicines = useMemo(() => prescriptionMedicines ?? [], [prescriptionMedicines]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MedicationImportResult | null>(null);
  const medicineKey = useMemo(
    () => medicines.map((medicine, index) => `${index}:${medicine.name}:${medicine.dosage}`).join('|'),
    [medicines],
  );

  useEffect(() => {
    setSelected(new Set(medicines.map((_, index) => index)));
    setError(null);
    setResult(null);
  }, [medicineKey, medicines]);

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function importSelectedMedicines() {
    const medicine_indices = Array.from(selected).sort((a, b) => a - b);
    if (medicine_indices.length === 0) {
      setError('Select at least one medicine to import.');
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const imported = await medicationService.importFromAppointment(appointmentId, {
        default_dose_times: ['08:00'],
        default_repeat: 'daily',
        medicine_indices,
      });
      invalidateApiQuery(queryKeys.medications);
      invalidateApiQuery(queryKeys.medicationDosesToday);
      setResult(imported);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import prescription.');
    } finally {
      setImporting(false);
    }
  }

  if (appointment.isLoading) return <ApiState title="Loading prescription medicines" loading />;
  if (appointment.error) {
    return (
      <ApiState
        title="Prescription import unavailable"
        message={appointment.error.message}
        actionLabel="Retry"
        onAction={appointment.reload}
      />
    );
  }
  if (!appointment.data?.prescription || medicines.length === 0) {
    return (
      <ApiState
        title="No prescription medicines"
        message="This appointment has no verified prescription medicines to import."
      />
    );
  }

  const selectedCount = selected.size;
  const resultMessage = result
    ? `${result.created.length} created, ${result.skipped.length} skipped.`
    : null;

  return (
    <Card style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={[typography.h3, { color: t.ink }]}>Appointment prescription</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 3 }]}>
            Select medicines to create medication plans and reminders from Core.
          </Text>
        </View>
        <Text style={[typography.caption, { color: t.brand }]}>{selectedCount}/{medicines.length}</Text>
      </View>

      {medicines.map((medicine, index) => (
        <MedicineImportRow
          key={`${medicine.name}-${medicine.dosage}-${index}`}
          medicine={medicine}
          selected={selected.has(index)}
          disabled={importing}
          onToggle={() => toggle(index)}
        />
      ))}

      {selectedCount === 0 && (
        <Text style={[typography.caption, { color: t.danger }]}>Select at least one medicine.</Text>
      )}
      {error && <ApiState title="Import failed" message={error} />}
      {resultMessage && (
        <ApiState
          title="Import complete"
          message={resultMessage}
          actionLabel="View medications"
          onAction={() => router.replace('/meds' as never)}
        />
      )}

      <Button
        label={importing ? 'Importing...' : `Import ${selectedCount} selected`}
        variant="solid"
        onPress={importSelectedMedicines}
        disabled={importing || selectedCount === 0}
        loading={importing}
      />
    </Card>
  );
}

function MedicineImportRow({
  medicine,
  selected,
  disabled,
  onToggle,
}: {
  medicine: PrescriptionMedicine;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      accessibilityRole="button"
      accessibilityLabel={`Select ${medicine.name}`}
      style={[styles.row, { borderColor: t.border, opacity: disabled ? 0.55 : 1 }]}
    >
      <Checkbox
        value={selected}
        onChange={onToggle}
        disabled={disabled}
        accessibilityLabel={`Import ${medicine.name}`}
      />
      <View style={styles.flex}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{medicine.name}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
          {[medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(' | ')}
        </Text>
        {medicine.notes && (
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{medicine.notes}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
