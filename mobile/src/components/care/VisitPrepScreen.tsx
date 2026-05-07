import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_CONTENT_HEIGHT } from '../nav/tab-bar-metrics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { TopBar } from '../layout/TopBar';
import { IconButton } from '../primitives/IconButton';
import { Checkbox } from '../primitives/input/Checkbox';
import { MissingApiState } from '../api/ApiState';
import { ApiState } from '../api/ApiState';
import { ChevronLeft } from '../../icons';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate, formatTime } from '../../api/viewModels';

const CHECKLIST_ITEMS = [
  'Bring insurance card',
  'List current medications',
  'Write down questions',
  'Confirm appointment time',
  'Arrange transport',
  'Fast if required',
  'Bring ID',
];

export function VisitPrepScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const apptId = (Array.isArray(id) ? id[0] : id) ?? '';
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));

  function toggleItem(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  const completedCount = checked.filter(Boolean).length;
  const progress = completedCount / CHECKLIST_ITEMS.length;

  const loadAppointment = useCallback(() => appointmentService.detail(apptId), [apptId]);
  const appointmentQuery = useApiQuery(queryKeys.appointment(apptId), loadAppointment, { enabled: Boolean(apptId) });
  const appointment = apptId ? (appointmentQuery.data ?? null) : null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.bar}>
        <TopBar
          title="Visit prep"
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={t.ink} />}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            />
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16 }]}>
        {/* Hero gradient card */}
        <LinearGradient
          colors={[t.brandSoft, t.accent + '30']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { borderRadius: t.radius.xl }]}
        >
          <Text style={[typography.title, { color: t.ink }]}>Get ready</Text>
          <Text style={[typography.body, { color: t.ink3, marginTop: 4 }]}>Complete this checklist before your visit</Text>
          {/* Progress bar */}
          <View style={[s.barTrack, { backgroundColor: t.border, marginTop: 12 }]}>
            <View style={[s.barFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: t.brand }]} />
          </View>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 6 }]}>
            {completedCount} / {CHECKLIST_ITEMS.length} items complete
          </Text>
        </LinearGradient>

        {/* Appointment context */}
        {apptId && appointmentQuery.isLoading && <ApiState title="Loading appointment" loading />}
        {apptId && appointmentQuery.error && (
          <ApiState
            title="Appointment unavailable"
            message={appointmentQuery.error.message}
            actionLabel="Retry"
            onAction={appointmentQuery.reload}
          />
        )}
        {appointment && (
          <View style={[s.contextCard, { backgroundColor: t.brandSoft, borderColor: t.border, borderRadius: t.radius.lg }]}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>Preparing for: {appointment.doctor_name}</Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>
              {appointment.specialty ?? 'Appointment'} · {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_date)}
            </Text>
          </View>
        )}

        {/* Checklist */}
        <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Before your visit</Text>
        <View style={[s.checklistCard, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
          {CHECKLIST_ITEMS.map((item, index) => (
            <React.Fragment key={item}>
              <View style={s.checkRow}>
                <View pointerEvents="none">
                  <Checkbox value={checked[index]} onChange={() => {}} />
                </View>
                <Pressable onPress={() => toggleItem(index)} style={{ flex: 1 }}>
                  <Text
                    style={[
                      typography.body,
                      {
                        color: checked[index] ? t.ink3 : t.ink,
                        textDecorationLine: checked[index] ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              </View>
              {index < CHECKLIST_ITEMS.length - 1 && (
                <View style={[s.divider, { backgroundColor: t.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        <MissingApiState title="Visit prep save unavailable" contract="existing API reusable" />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  hero:         { padding: 20, marginBottom: 4 },
  barTrack:     { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill:      { height: 4, borderRadius: 2 },
  contextCard:  { padding: 14, gap: 4 },
  checklistCard:{ padding: 16 },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider:      { height: StyleSheet.hairlineWidth },
});
