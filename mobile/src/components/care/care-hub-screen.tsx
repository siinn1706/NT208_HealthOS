import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { useThemeContext } from '../../theme/theme-provider';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { Card } from '../primitives/card';
import { IconButton } from '../primitives/icon-button';
import { ApiState } from '../api/api-state';
import { useApiQuery } from '../../api/query';
import { appointmentService, medicationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import {
  IconCalendar,
  ChevronRight,
  IconUtensils,
  IconPill,
  IconActivity,
  IconFilter,
  IconPlus,
  IconVideo,
  IconTarget,
} from '../../icons';

// Gradient palettes per theme
const HERO_GRADIENTS: Record<string, readonly [string, string]> = {
  calm:  ['#1965B3', '#3A8FD4'],
  night: ['#1A4060', '#0B2030'],
  warm:  ['#8C5A2A', '#C4854A'],
};

function fmtDate(value?: string | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Joined quick-access rows inside a single Card
const QUICK_ROWS = [
  { id: 'prescriptions', icon: <IconPill size={20} color="#41BCE6" />, iconBg: '#41BCE618', title: 'Prescriptions', subtitle: 'View active prescriptions', route: '/care/prescriptions' },
  { id: 'scan',          icon: <IconTarget size={20} color="#D97706" />, iconBg: '#D9770618', title: 'Scan a meal', subtitle: 'AI-powered food scan', route: '/meals/scan' },
  { id: 'book',          icon: <IconCalendar size={20} color="#7C3AED" />, iconBg: '#7C3AED18', title: 'Book appointment', subtitle: 'Schedule a consultation', route: '/care/appointments/new' },
];

export function CareHubScreen() {
  const t = useTheme();
  const { name: themeName } = useThemeContext();

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

  const gradient = HERO_GRADIENTS[themeName] ?? HERO_GRADIENTS.calm;

  // 2×2 grid tiles
  const gridTiles = [
    { id: 'appointments', icon: <IconCalendar size={20} color={t.brand} />, iconBg: t.brand + '18', title: 'Appointments', subtitle: `${upcomingCount} upcoming`, route: '/care/appointments', badge: null },
    { id: 'history',      icon: <IconActivity size={20} color={t.success} />, iconBg: t.success + '18', title: 'Medical History', subtitle: lastCompleted ? `Last ${fmtDate(lastCompleted.appointment_date)}` : 'No previous visit', route: '/care/history', badge: null },
    { id: 'meals',        icon: <IconUtensils size={20} color={t.warning} />, iconBg: t.warning + '18', title: 'Meals & Nutrition', subtitle: 'Daily nutrition logs', route: '/meals', badge: null },
    { id: 'lab',          icon: <IconTarget size={20} color="#DC2626" />, iconBg: '#DC262618', title: 'Lab Reports', subtitle: 'View test results', route: '/care/lab-reports', badge: 3 },
  ];

  return (
    <Screen>
      <TopBar
        title="Care"
        subtitle="Appointments · Prep · History"
        right={
          <View style={styles.topBarIcons}>
            <IconButton icon={<IconFilter size={20} color={t.ink2} />} onPress={() => {}} accessibilityLabel="Filter" />
            <IconButton variant="filled" icon={<IconPlus size={20} color="#FFF" />} onPress={() => router.push('/care/appointments/new' as never)} accessibilityLabel="New" />
          </View>
        }
      />

      {appointments.isLoading && <ApiState title="Loading care summary" loading />}
      {appointments.error && (
        <ApiState title="Care summary unavailable" message={appointments.error.message} actionLabel="Retry" onAction={appointments.reload} />
      )}

      {!appointments.isLoading && !appointments.error && (
        <>
          {/* Hero gradient card */}
          <View style={styles.heroWrap}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
              <Text style={[typography.micro, { color: 'rgba(255,255,255,0.7)', marginBottom: 4 }]}>
                TODAY · {nextAppointment ? fmtDate(nextAppointment.appointment_date).toUpperCase() : '--:--'}
              </Text>
              <Text style={[typography.h3, { color: '#FFF', marginBottom: 2 }]}>
                {nextAppointment?.doctor_name ?? 'No upcoming appointment'}
              </Text>
              <Text style={[typography.bodyMed, { color: 'rgba(255,255,255,0.8)', marginBottom: 16 }]}>
                {nextAppointment
                  ? `${nextAppointment.specialty ?? 'General'} · ${fmtDate(nextAppointment.appointment_date)}`
                  : 'Book a consultation to keep your timeline up to date'}
              </Text>
              <View style={styles.heroActions}>
                {nextAppointment ? (
                  <>
                    <Pressable style={[styles.heroBtnPrimary]} onPress={() => router.push('/care/appointments' as never)}>
                      <IconVideo size={16} color="#1965B3" />
                      <Text style={[typography.bodyMed, { color: '#1965B3', fontWeight: '700', marginLeft: 6 }]}>Join</Text>
                    </Pressable>
                    <Pressable style={[styles.heroBtnGhost]} onPress={() => router.push('/care/appointments' as never)}>
                      <Text style={[typography.bodyMed, { color: '#FFF', fontWeight: '600' }]}>Prep</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable style={[styles.heroBtnPrimary]} onPress={() => router.push('/care/appointments/new' as never)}>
                    <Text style={[typography.bodyMed, { color: '#1965B3', fontWeight: '700' }]}>Book now</Text>
                  </Pressable>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* 2×2 module grid */}
          <View style={[styles.section, { paddingHorizontal: 16 }]}>
            <View style={styles.grid}>
              {gridTiles.map((tile) => (
                <TouchableOpacity
                  key={tile.id}
                  style={[styles.tile, { backgroundColor: t.card, borderColor: t.border }]}
                  onPress={() => router.push(tile.route as never)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tileIcon, { backgroundColor: tile.iconBg }]}>
                    {tile.icon}
                  </View>
                  {tile.badge != null && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{tile.badge}</Text>
                    </View>
                  )}
                  <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700', fontSize: 14, marginTop: 8 }]}>
                    {tile.title}
                  </Text>
                  <Text style={[typography.micro, { color: t.ink3, fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
                    {tile.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Access section */}
          <Text style={[styles.sectionLabel, { color: t.ink3 }]}>QUICK ACCESS</Text>
          <Card style={[styles.quickCard, { marginHorizontal: 16, overflow: 'hidden' }]}>
            {QUICK_ROWS.map((row, idx) => (
              <React.Fragment key={row.id}>
                <TouchableOpacity
                  style={styles.quickRow}
                  onPress={() => router.push(row.route as never)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickIcon, { backgroundColor: row.iconBg }]}>
                    {row.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '600' }]}>{row.title}</Text>
                    <Text style={[typography.micro, { color: t.ink3 }]}>{row.subtitle}</Text>
                  </View>
                  <ChevronRight size={16} color={t.ink3} />
                </TouchableOpacity>
                {idx < QUICK_ROWS.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
              </React.Fragment>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBarIcons: { flexDirection: 'row', gap: 2 },
  heroWrap:    { marginHorizontal: 16, marginTop: 8, marginBottom: 20 },
  heroGradient:{ borderRadius: 16, padding: 20 },
  heroActions: { flexDirection: 'row', gap: 10 },
  heroBtnPrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  heroBtnGhost:   { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  section:     { marginBottom: 20 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile:        { width: '47%', borderRadius: 16, borderWidth: 1, padding: 14, position: 'relative' },
  tileIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge:       { position: 'absolute', top: 10, right: 10, backgroundColor: '#DC2626', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:   { color: '#FFF', fontSize: 9, fontWeight: '700' },
  sectionLabel:{ fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 8 },
  quickCard:   { marginBottom: 24 },
  quickRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  quickIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider:     { height: StyleSheet.hairlineWidth, marginLeft: 68 },
});
