import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Appointment } from '../../../../shared/api-contracts';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import { ChevronLeft, IconPill } from '../../icons';
import { appointmentService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';
import { ApiState } from '../api/api-state';
import { PrescriptionImportPanel } from './prescription-import-panel';

const IMPORT_OPTION_KEYS = [
  { Icon: IconPill,   titleKey: 'enterManually',       subKey: 'enterManuallySub' },
] as const;

export function ImportMedicationScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const sourceAppointmentId = Array.isArray(appointmentId) ? appointmentId[0] : appointmentId;
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const effectiveAppointmentId = sourceAppointmentId ?? selectedSourceId;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('meds.importMeds')}
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel={i18n('common.back')}
            />
          }
        />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
        <Text style={[typography.body, { color: t.brand, lineHeight: 22 }]}>
          {i18n('meds.importDescription')}
        </Text>

        {effectiveAppointmentId ? (
          <PrescriptionImportPanel appointmentId={effectiveAppointmentId} />
        ) : (
          <PrescriptionSourcePicker onSelect={setSelectedSourceId} />
        )}

        <Text style={[typography.h3, { color: t.ink, marginBottom: 8, marginTop: 8 }]}>{i18n('meds.addAnotherWay')}</Text>
        {IMPORT_OPTION_KEYS.map(opt => {
          const title = i18n(`meds.${opt.titleKey}` as any);
          const sub = i18n(`meds.${opt.subKey}` as any);
          return (
          <Pressable
            key={opt.titleKey}
            onPress={() => router.push('/meds/add')}
            style={({ pressed }) => [
              s.optRow,
              { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg },
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={title}
          >
            <View style={[s.optIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
              <opt.Icon size={22} color={t.brand} />
            </View>
            <View style={s.flex}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{title}</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{sub}</Text>
            </View>
          </Pressable>
          );
        })}

        <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PrescriptionSourcePicker({ onSelect }: { onSelect: (appointmentId: string) => void }) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery<Appointment[]>(queryKeys.appointments, loadAppointments);
  const sources = useMemo(() => prescriptionSources(appointments.data ?? []), [appointments.data]);

  return (
    <View style={s.sourceSection}>
      <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>{i18n('meds.connectedSources')}</Text>
      {appointments.isLoading && <ApiState title={i18n('meds.loadingPrescriptionSources')} loading />}
      {appointments.error && (
        <ApiState
          title={i18n('meds.prescriptionSourcesUnavailable')}
          message={appointments.error.message}
          actionLabel={i18n('common.retry')}
          onAction={appointments.reload}
        />
      )}
      {!appointments.isLoading && !appointments.error && sources.length === 0 && (
        <ApiState title={i18n('meds.noPrescriptionSources')} message={i18n('meds.noPrescriptionSourcesMessage')} />
      )}
      {!appointments.isLoading && !appointments.error && sources.map((appointment) => (
        <PrescriptionSourceRow key={appointment.id} appointment={appointment} onSelect={() => onSelect(appointment.id)} />
      ))}
    </View>
  );
}

function PrescriptionSourceRow({ appointment, onSelect }: { appointment: Appointment; onSelect: () => void }) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const prescription = appointment.prescription;
  const medicines = prescription?.medicines ?? [];
  const title = medicines[0]?.name ?? i18n('care.prescriptions');
  const doctor = prescription?.doctor ?? appointment.doctor_name;
  const clinic = prescription?.clinic ?? appointment.clinic;
  const issued = prescription?.issued_at ?? appointment.appointment_date;

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        s.sourceRow,
        { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Select prescription source ${doctor}`}
    >
      <View style={[s.optIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
        <IconPill size={22} color={t.brand} />
      </View>
      <View style={s.flex}>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]} numberOfLines={1}>
          {[doctor, clinic].filter(Boolean).join(' | ')}
        </Text>
        <Text style={[typography.caption, { color: t.ink4, marginTop: 2 }]}>
          {formatDate(issued)} | {medicines.length} {i18n('meds.prescriptionMedicineCount')}
        </Text>
      </View>
    </Pressable>
  );
}

function prescriptionSources(appointments: Appointment[]) {
  return appointments
    .filter((appointment) => (
      appointment.has_prescription
      && Boolean(appointment.prescription)
      && (appointment.prescription?.medicines.length ?? 0) > 0
    ))
    .sort((a, b) => {
      const aTime = new Date(a.prescription?.issued_at ?? a.appointment_date).getTime();
      const bTime = new Date(b.prescription?.issued_at ?? b.appointment_date).getTime();
      return bTime - aTime;
    });
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  flex:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  optRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  optIcon:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sourceSection:{ gap: 10 },
  sourceRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth },
});
