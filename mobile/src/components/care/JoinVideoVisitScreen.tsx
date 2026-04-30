import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { IconButton } from '../primitives/IconButton';
import { MissingApiState } from '../api/ApiState';
import { ApiState } from '../api/ApiState';
import { ChevronLeft } from '../../icons';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate, formatTime } from '../../api/viewModels';

export function JoinVideoVisitScreen() {
  const t = useTheme();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const apptId = (Array.isArray(appointmentId) ? appointmentId[0] : appointmentId) ?? '';

  // Load appointment context from the shared list (no single-appointment endpoint available yet)
  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(
    queryKeys.appointment(apptId),
    loadAppointments,
    { enabled: Boolean(apptId) },
  );
  const appointment = appointments.data?.find((item) => item.id === apptId) ?? null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Video visit"
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
        />
      </View>

      <View style={s.content}>
        {/* Appointment context */}
        {appointments.isLoading && <ApiState title="Loading appointment" loading />}
        {appointments.error && (
          <ApiState
            title="Appointment unavailable"
            message={appointments.error.message}
            actionLabel="Retry"
            onAction={appointments.reload}
          />
        )}

        {appointment && (
          <View style={[s.contextCard, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>{appointment.doctor_name}</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>
              {appointment.specialty ?? 'Appointment'} · {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_date)}
            </Text>
          </View>
        )}

        {!apptId && (
          <View style={[s.contextCard, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
            <Text style={[typography.caption, { color: t.ink3 }]}>No appointment context provided.</Text>
          </View>
        )}

        {/* Video join is not yet available */}
        <MissingApiState title="Video visit unavailable" contract="missing API" />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  bar:         { paddingHorizontal: 16 },
  content:     { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  contextCard: { padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
});
