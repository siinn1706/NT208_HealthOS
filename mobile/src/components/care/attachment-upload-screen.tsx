import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { ChevronLeft, IconPaperclip } from '../../icons';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate, formatTime } from '../../api/viewModels';
import { humanizeError } from '../../api/error-message';
import { AppointmentAssetsCard } from './appointment-assets-card';

export function AttachmentUploadScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(queryKeys.appointments, loadAppointments);

  const selectedAppointment = useMemo(() => {
    const rows = appointments.data ?? [];
    return rows.find((appointment) => appointment.id === selectedId) ?? rows[0] ?? null;
  }, [appointments.data, selectedId]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title={i18n('care.attachments')}
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel={i18n('common.back')}
            />
          }
        />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {appointments.isLoading && <ApiState title={i18n('care.loadingAppointments')} loading />}
        {appointments.error && (
          <ApiState
            title={i18n('care.appointmentsUnavailable')}
            message={humanizeError(appointments.error)}
            actionLabel={i18n('common.retry')}
            onAction={appointments.reload}
          />
        )}
        {!appointments.isLoading && !appointments.error && (appointments.data ?? []).length === 0 && (
          <ApiState
            title={i18n('care.noAppointments')}
            message={i18n('care.selectAppointmentBeforeUpload')}
            actionLabel={i18n('care.bookAppointmentCta')}
            onAction={() => router.push('/care/appointments/new' as never)}
          />
        )}

        {(appointments.data ?? []).length > 0 && (
          <>
            <Text style={[typography.h3, { color: t.ink }]}>{i18n('care.chooseAppointmentForFiles')}</Text>
            <View style={s.appointmentList}>
              {(appointments.data ?? []).map((appointment) => {
                const selected = appointment.id === selectedAppointment?.id;
                return (
                  <Pressable
                    key={appointment.id}
                    onPress={() => setSelectedId(appointment.id)}
                    style={[
                      s.appointmentRow,
                      {
                        backgroundColor: selected ? t.brandSoft : t.card,
                        borderColor: selected ? t.brand : t.border,
                        borderRadius: t.radius.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View style={[s.rowIcon, { backgroundColor: selected ? t.card : t.brandSoft, borderRadius: t.radius.sm }]}>
                      <IconPaperclip size={16} color={t.brand} />
                    </View>
                    <View style={s.rowText}>
                      <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>
                        {appointment.doctor_name}
                      </Text>
                      <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>
                        {formatDate(appointment.appointment_date)} | {formatTime(appointment.appointment_date)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {selectedAppointment && (
              <AppointmentAssetsCard
                appointmentId={selectedAppointment.id}
                title={i18n('care.appointmentFiles')}
                helperText={i18n('care.appointmentFilesVerifiedContract')}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  bar: { paddingHorizontal: 16 },
  content: { paddingHorizontal: 16, gap: 12, paddingBottom: 24 },
  appointmentList: { gap: 8 },
  appointmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  rowIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
});
