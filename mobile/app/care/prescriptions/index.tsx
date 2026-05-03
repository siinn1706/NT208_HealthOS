import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../../src/theme/useTheme';
import { typography } from '../../../src/theme/typography';
import { Screen } from '../../../src/components/layout/Screen';
import { TopBar } from '../../../src/components/layout/TopBar';
import { IconButton } from '../../../src/components/primitives/IconButton';
import { ApiState } from '../../../src/components/api/ApiState';
import { useApiQuery } from '../../../src/api/query';
import { appointmentService } from '../../../src/api/services';
import { queryKeys } from '../../../src/api/queryKeys';
import { formatDate } from '../../../src/api/viewModels';
import { IconPill, ChevronRight } from '../../../src/icons';

export default function PrescriptionsRoute() {
  const t = useTheme();
  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(queryKeys.appointments, loadAppointments);

  const prescriptions = useMemo(() => {
    return (appointments.data ?? [])
      .filter((appointment) => appointment.prescription && appointment.has_prescription)
      .sort((a, b) => {
        const aTime = new Date(a.appointment_date).getTime();
        const bTime = new Date(b.appointment_date).getTime();
        return bTime - aTime;
      });
  }, [appointments.data]);

  return (
    <Screen>
      <TopBar
        title="Prescriptions"
        subtitle={`${prescriptions.length} available`}
        right={<IconButton icon={<IconPill size={20} color={t.brand} />} accessibilityLabel="Prescriptions" />}
      />

      {appointments.isLoading && <ApiState title="Loading prescriptions" loading />}
      {appointments.error && (
        <ApiState
          title="Prescriptions unavailable"
          message={appointments.error.message}
          actionLabel="Retry"
          onAction={appointments.reload}
        />
      )}
      {!appointments.isLoading && !appointments.error && prescriptions.length === 0 && (
        <ApiState title="No prescriptions found" message="Prescriptions appear after a consultation includes medication data." />
      )}

      {prescriptions.map((appointment) => {
        const prescription = appointment.prescription;
        const medicines = prescription?.medicines ?? [];
        return (
          <TouchableOpacity
            key={appointment.id}
            onPress={() => router.push(`/care/prescriptions/${appointment.id}` as never)}
            style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}
            activeOpacity={0.75}
          >
            <View style={[styles.icon, { backgroundColor: t.brandSoft }]}>
              <IconPill size={20} color={t.brand} />
            </View>
            <View style={styles.info}>
              <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]} numberOfLines={1}>
                {medicines[0]?.name ?? 'Prescription'}
              </Text>
              <Text style={[typography.body, { color: t.ink3 }]} numberOfLines={1}>
                {appointment.doctor_name}
              </Text>
              <Text style={[typography.micro, { color: t.ink4, marginTop: 2 }]}>
                Issued {formatDate(prescription?.issued_at ?? appointment.appointment_date)} · {medicines.length} medicines
              </Text>
            </View>
            <ChevronRight size={16} color={t.ink3} />
          </TouchableOpacity>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1 },
});
