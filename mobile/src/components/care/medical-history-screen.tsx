import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_CONTENT_HEIGHT } from '../nav/tab-bar-metrics';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/chip';
import { PressableCard } from '../primitives/pressable-card';
import { TopBar } from '../layout/top-bar';
import { ApiState } from '../api/api-state';
import { TimelineSkeleton } from '../api/skeletons';
import { Timeline } from './timeline';
import { appointmentService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { formatDate } from '../../api/viewModels';
import type { Appointment } from '../../../../shared/api-contracts';

function MiniStats({ history }: { history: Appointment[] }) {
  const t = useTheme();
  const completed = history.filter((v) => v.status === 'completed').length;
  const doctors = new Set(history.map((v) => v.doctor_name)).size;
  const stats = [
    { label: 'Visits', value: String(history.length) },
    { label: 'Completed', value: String(completed) },
    { label: 'Providers', value: String(doctors) },
  ];
  return (
    <View style={[ms.row, { backgroundColor: t.card, borderRadius: t.radius.lg }]}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          <View style={ms.cell}>
            <Text style={[typography.title, { color: t.brand }]}>{s.value}</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>{s.label}</Text>
          </View>
          {i < stats.length - 1 && <View style={[ms.sep, { backgroundColor: t.border }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  row:  { flexDirection: 'row', padding: 16, marginBottom: 16 },
  cell: { flex: 1, alignItems: 'center', gap: 2 },
  sep:  { width: StyleSheet.hairlineWidth, height: '70%', alignSelf: 'center' },
});

function VisitCard({ visit }: { visit: Appointment }) {
  const t = useTheme();
  return (
    <PressableCard
      onPress={() => router.push(`/care/appointment/${visit.id}` as never)}
      haptic
      style={[
        s.visitRow,
        { backgroundColor: t.card, borderRadius: t.radius.lg },
      ]}
    >
      <View style={s.visitContent}>
        <View style={s.visitHeader}>
          <View style={[s.dateBadge, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
            <Text style={[typography.micro, { color: t.brand }]}>{formatDate(visit.appointment_date)}</Text>
          </View>
          <Chip
            label={visit.status}
            variant={visit.status === 'completed' ? 'success' : visit.status === 'cancelled' ? 'danger' : 'default'}
          />
        </View>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{visit.doctor_name}</Text>
        <Text style={[typography.caption, { color: t.ink3 }]}>
          {visit.specialty ?? 'Appointment'} · {visit.clinic ?? 'Clinic not specified'}
        </Text>
      </View>
    </PressableCard>
  );
}

export function MedicalHistoryScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(`${queryKeys.appointments}.history`, loadAppointments);
  const history = (appointments.data ?? []).filter(
    (visit) => visit.status === 'completed' || new Date(visit.appointment_date).getTime() < Date.now(),
  );

  const timelineItems = history.map((visit) => ({
    id: visit.id,
    year: new Date(visit.appointment_date).getFullYear(),
    node: <VisitCard visit={visit} />,
  }));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.topBarWrap}>
        <TopBar
          title="Visit History"
          left={
            <Text style={[typography.bodyMed, { color: t.brand }]} onPress={() => router.back()}>
              Back
            </Text>
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16 }]}>
        {appointments.isLoading && (
          <ApiState title="Loading visit history" loading skeleton={<TimelineSkeleton />} />
        )}
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

        {/* Mini stats row */}
        {!appointments.isLoading && history.length > 0 && (
          <MiniStats history={history} />
        )}

        {!appointments.isLoading && timelineItems.length > 0 && (
          <Timeline items={timelineItems} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  topBarWrap:   { paddingHorizontal: 20 },
  scroll:       { paddingHorizontal: 20 },
  visitRow:     { flexDirection: 'row', marginBottom: 10, overflow: 'hidden' },
  visitContent: { flex: 1, padding: 14, gap: 4 },
  visitHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateBadge:    { paddingHorizontal: 8, paddingVertical: 3 },
});
