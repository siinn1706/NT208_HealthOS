import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { SectionHeader } from '../layout/section-header';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { ApptListSkeleton } from '../api/skeletons';
import { WeekStrip } from './week-strip';
import { SegmentedTabs } from './segmented-tabs';
import { HeroAppointmentCard } from './hero-appointment-card';
import { AptRow } from './apt-row';
import { PrepForVisitCard } from './prep-for-visit-card';
import { IconFilter, IconPlus } from '../../icons';
import { useTheme } from '../../theme/useTheme';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { makeWeekDays, toAppointmentRow, toHeroAppointment } from '../../api/viewModels';

const TABS = ['Upcoming', 'Past', 'All'];
type StatusFilter = 'All' | 'Upcoming' | 'Past';

export function AppointmentsScreen() {
  const t = useTheme();
  const [tab, setTab] = useState('Upcoming');
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<StatusFilter>('All');
  const [appliedFilter, setAppliedFilter] = useState<StatusFilter>('All');

  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(queryKeys.appointments, loadAppointments);

  const filteredAppointments = useMemo(() => {
    let rows = appointments.data ?? [];
    if (tab === 'Past') {
      rows = rows.filter((apt) => new Date(apt.appointment_date).getTime() < Date.now() || apt.status === 'completed');
    } else if (tab === 'Upcoming') {
      rows = rows.filter((apt) => new Date(apt.appointment_date).getTime() >= Date.now() && apt.status !== 'cancelled');
    }
    if (appliedFilter === 'Upcoming') {
      rows = rows.filter((apt) => new Date(apt.appointment_date).getTime() >= Date.now() && apt.status !== 'cancelled');
    } else if (appliedFilter === 'Past') {
      rows = rows.filter((apt) => new Date(apt.appointment_date).getTime() < Date.now() || apt.status === 'completed');
    }
    if (selectedDate !== null) {
      rows = rows.filter((apt) => new Date(apt.appointment_date).getDate() === selectedDate);
    }
    return rows;
  }, [appointments.data, tab, appliedFilter, selectedDate]);

  const hero = filteredAppointments[0] ? toHeroAppointment(filteredAppointments[0]) : null;
  const weekDays = makeWeekDays(appointments.data ?? []);
  const upcomingCount = (appointments.data ?? []).filter((apt) => new Date(apt.appointment_date).getTime() >= Date.now()).length;
  const pastCount = (appointments.data ?? []).filter((apt) => new Date(apt.appointment_date).getTime() < Date.now()).length;
  const emptyMessage = selectedDate !== null
    ? `No ${tab.toLowerCase()} appointments on day ${selectedDate}.`
    : `No ${tab.toLowerCase()} appointments.`;

  return (
    <Screen>
      <TopBar
        title="Appointments"
        subtitle={`${upcomingCount} upcoming · ${pastCount} past`}
        right={
          <View style={styles.actions}>
            <IconButton
              variant="subtle"
              icon={<IconFilter size={20} color={appliedFilter !== 'All' ? t.brand : t.ink3} />}
              accessibilityLabel="Filter"
              onPress={() => { setPendingFilter(appliedFilter); setFilterOpen(true); }}
            />
            <IconButton
              icon={<IconPlus size={20} color={t.brand} />}
              variant="filled"
              accessibilityLabel="New appointment"
              onPress={() => router.push('/care/appointments/new')}
            />
          </View>
        }
      />
      <WeekStrip days={weekDays} selectedDate={selectedDate ?? new Date().getDate()} onSelect={(d) => setSelectedDate((prev) => prev === d ? null : d)} />
      {selectedDate !== null && (
        <Pressable onPress={() => setSelectedDate(null)} style={[styles.resetDate, { backgroundColor: t.brandSoft }]}>
          <Text style={{ color: t.brand, fontSize: 12 }}>Showing day {selectedDate} · Tap to reset</Text>
        </Pressable>
      )}
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      {appointments.isLoading && <ApiState title="Loading appointments" loading skeleton={<ApptListSkeleton />} />}
      {appointments.error && <ApiState title="Appointments unavailable" message={appointments.error.message} actionLabel="Retry" onAction={appointments.reload} />}
      {hero && <HeroAppointmentCard {...hero} onJoin={() => router.push(`/care/video/${hero.id}` as never)} />}
      <SectionHeader title={selectedDate !== null ? `Day ${selectedDate}` : 'This week'} />
      {!appointments.isLoading && !appointments.error && filteredAppointments.length === 0 && (
        <ApiState title="No appointments" message={emptyMessage} />
      )}
      {filteredAppointments.map((apt) => {
        const row = toAppointmentRow(apt);
        return <AptRow key={row.id} {...row} onPress={() => router.push(`/care/appointment/${row.id}` as never)} />;
      })}
      <PrepForVisitCard onPress={() => router.push('/care/prep/new' as never)} />
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={{ color: t.ink, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>Filter appointments</Text>
          {(['All', 'Upcoming', 'Past'] as StatusFilter[]).map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setPendingFilter(opt)}
              style={[styles.filterOption, { backgroundColor: pendingFilter === opt ? t.brandSoft : t.bg, borderColor: pendingFilter === opt ? t.brand : t.border }]}
            >
              <Text style={{ color: pendingFilter === opt ? t.brand : t.ink, fontWeight: pendingFilter === opt ? '600' : '400' }}>{opt}</Text>
            </Pressable>
          ))}
          <View style={styles.filterActions}>
            <Pressable onPress={() => { setPendingFilter('All'); setAppliedFilter('All'); setFilterOpen(false); }} style={[styles.filterBtn, { backgroundColor: t.bg, borderColor: t.border }]}>
              <Text style={{ color: t.ink3 }}>Clear</Text>
            </Pressable>
            <Pressable onPress={() => { setAppliedFilter(pendingFilter); setFilterOpen(false); }} style={[styles.filterBtn, { backgroundColor: t.brand, flex: 2 }]}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions:       { flexDirection: 'row', gap: 4 },
  resetDate:     { marginHorizontal: 16, marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet:         { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  filterOption:  { padding: 14, borderWidth: 1, marginBottom: 8, borderRadius: 8 },
  filterActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  filterBtn:     { flex: 1, padding: 14, alignItems: 'center', borderWidth: 1, borderRadius: 8 },
});
