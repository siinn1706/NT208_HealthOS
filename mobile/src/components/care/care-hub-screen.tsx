import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { Card } from '../primitives/Card';
import { ApiState } from '../api/ApiState';
import { useApiQuery } from '../../api/query';
import { appointmentService, medicationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import {
  IconCalendar,
  ChevronRight,
  IconUtensils,
  IconPill,
  IconActivity,
} from '../../icons';

type HubItem = {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  route: string;
};

function fmtDate(value?: string | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function CareHubScreen() {
  const t = useTheme();

  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const loadMeds = useCallback(() => medicationService.list('active'), []);

  const appointments = useApiQuery(queryKeys.appointments, loadAppointments);
  const meds = useApiQuery(queryKeys.medications, loadMeds);

  const now = Date.now();
  const nextAppointment = useMemo(() => {
    const rows = appointments.data ?? [];
    return rows
      .filter((apt) => !['cancelled', 'completed', 'no_show'].includes(apt.status) && new Date(apt.appointment_date).getTime() >= now)
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0] ?? null;
  }, [appointments.data, now]);

  const upcomingCount = useMemo(
    () => (appointments.data ?? []).filter((apt) => new Date(apt.appointment_date).getTime() >= now && !['cancelled', 'completed', 'no_show'].includes(apt.status)).length,
    [appointments.data, now],
  );

  const lastCompleted = useMemo(
    () => (appointments.data ?? [])
      .filter((apt) => ['completed'].includes(apt.status) || new Date(apt.appointment_date).getTime() < now)
      .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0] ?? null,
    [appointments.data, now],
  );

  const items: HubItem[] = [
    {
      id: 'appointments',
      icon: <IconCalendar size={22} color={t.brand} />,
      title: 'Appointments',
      subtitle: `${upcomingCount} upcoming`,
      route: '/care/appointments',
    },
    {
      id: 'history',
      icon: <IconActivity size={22} color={t.success} />,
      title: 'Medical History',
      subtitle: lastCompleted ? `Last visit ${fmtDate(lastCompleted.appointment_date)}` : 'No previous visit',
      route: '/care/history',
    },
    {
      id: 'meals',
      icon: <IconUtensils size={22} color={t.warning} />,
      title: 'Meals & Nutrition',
      subtitle: 'View daily nutrition logs',
      route: '/meals',
    },
    {
      id: 'prescriptions',
      icon: <IconPill size={22} color={t.brand} />,
      title: 'Prescriptions',
      subtitle: `${(meds.data ?? []).length} active`,
      route: '/care/prescriptions',
    },
  ];

  return (
    <Screen>
      <TopBar title="Care" subtitle="Your health management" />

      {appointments.isLoading && (
        <ApiState title="Loading care summary" loading />
      )}
      {appointments.error && (
        <ApiState title="Care summary unavailable" message={appointments.error.message} actionLabel="Retry" onAction={appointments.reload} />
      )}

      {!appointments.isLoading && !appointments.error && (
        <>
          <Card style={{ ...styles.hero, backgroundColor: t.brand }}>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.75)', marginBottom: 4 }]}>
              NEXT APPOINTMENT
            </Text>
            <Text style={[typography.h3, { color: '#FFF', marginBottom: 2 }]}>
              {nextAppointment?.doctor_name ?? 'No upcoming appointment'}
            </Text>
            <Text style={[typography.bodyMed, { color: 'rgba(255,255,255,0.85)', marginBottom: 12 }]}>
              {nextAppointment
                ? `${nextAppointment.specialty ?? 'General'} · ${fmtDate(nextAppointment.appointment_date)}`
                : 'Book a consultation to keep your timeline up to date'}
            </Text>
          </Card>

          <View style={styles.list}>
            {items.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(item.route as never)}
                style={[
                  styles.row,
                  { backgroundColor: t.card, borderColor: t.border },
                  idx < items.length - 1 && { marginBottom: 10 },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: t.bgElev }]}>
                  {item.icon}
                </View>
                <View style={styles.rowText}>
                  <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]}>
                    {item.title}
                  </Text>
                  <Text style={[typography.body, { color: t.ink3 }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <ChevronRight size={18} color={t.ink3} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero:       { marginHorizontal: 16, marginTop: 8, marginBottom: 20, padding: 20, borderRadius: 16 },
  list:       { paddingHorizontal: 16 },
  row:        { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowText:    { flex: 1 },
});
