import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/Chip';
import { PressableCard } from '../primitives/PressableCard';
import { TopBar } from '../layout/TopBar';
import { ApiState } from '../api/ApiState';
import { appointmentService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';

export function MedicalHistoryScreen() {
  const t = useTheme();
  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(`${queryKeys.appointments}.history`, loadAppointments);
  const history = (appointments.data ?? []).filter(
    (visit) => visit.status === 'completed' || new Date(visit.appointment_date).getTime() < Date.now(),
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.topBarWrap}>
        <TopBar
          title="Visit History"
          left={
            <Text style={[typography.bodyMed, { color: t.primary }]} onPress={() => router.back()}>
              Back
            </Text>
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {appointments.isLoading && <ApiState title="Loading visit history" loading />}
        {appointments.error && (
          <ApiState
            title="Visit history unavailable"
            message={appointments.error.message}
            actionLabel="Retry"
            onAction={appointments.reload}
          />
        )}
        {!appointments.isLoading && !appointments.error && history.length === 0 && (
          <ApiState title="No visit history" message="Completed appointments will appear here." />
        )}

        {history.map((visit) => (
          <PressableCard
            key={visit.id}
            onPress={() => router.push(`/care/appointment/${visit.id}` as never)}
            haptic
            style={[
              s.visitRow,
              {
                backgroundColor: t.card,
                borderColor: t.border,
                borderRadius: t.radius.lg,
              },
            ]}
          >
            <View style={s.visitContent}>
              <View style={s.visitHeader}>
                <View style={[s.dateBadge, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
                  <Text style={[typography.micro, { color: t.brand }]}>{formatDate(visit.appointment_date)}</Text>
                </View>
                <Chip label={visit.status} variant={visit.status === 'completed' ? 'success' : 'default'} />
              </View>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{visit.doctor_name}</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>
                {visit.specialty ?? 'Appointment'} · {visit.clinic ?? 'Clinic not specified'}
              </Text>
            </View>
          </PressableCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  topBarWrap:   { paddingHorizontal: 20 },
  scroll:       { paddingHorizontal: 20, paddingBottom: 80 },
  visitRow:     { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, marginBottom: 8, overflow: 'hidden' },
  visitContent: { flex: 1, padding: 12, gap: 4 },
  visitHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateBadge:    { paddingHorizontal: 8, paddingVertical: 3 },
});
