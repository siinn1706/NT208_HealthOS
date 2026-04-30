import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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

// Hardcoded checklist items shown for every visit prep
const CHECKLIST_ITEMS = [
  'Bring insurance card',
  'List current medications',
  'Write down questions',
  'Confirm appointment time',
];

export function VisitPrepScreen() {
  const t = useTheme();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const apptId = (Array.isArray(appointmentId) ? appointmentId[0] : appointmentId) ?? '';

  // Checked state per item index
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));

  function toggleItem(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  // Load appointment context when an id is provided
  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(
    queryKeys.appointment(apptId),
    loadAppointments,
    { enabled: Boolean(apptId) },
  );
  const appointment = apptId ? (appointments.data?.find((item) => item.id === apptId) ?? null) : null;

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Appointment context */}
        {apptId && appointments.isLoading && <ApiState title="Loading appointment" loading />}
        {apptId && appointments.error && (
          <ApiState
            title="Appointment unavailable"
            message={appointments.error.message}
            actionLabel="Retry"
            onAction={appointments.reload}
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
              <Pressable
                onPress={() => toggleItem(index)}
                style={s.checkRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: checked[index] }}
              >
                {/* Simple checkbox square */}
                <View
                  style={[
                    s.checkbox,
                    {
                      backgroundColor: checked[index] ? t.brand : 'transparent',
                      borderColor: checked[index] ? t.brand : t.borderStrong,
                      borderRadius: 4,
                    },
                  ]}
                >
                  {checked[index] && (
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', lineHeight: 14 }}>✓</Text>
                  )}
                </View>
                <Text
                  style={[
                    typography.body,
                    {
                      color: checked[index] ? t.ink3 : t.ink,
                      textDecorationLine: checked[index] ? 'line-through' : 'none',
                      flex: 1,
                    },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
              {index < CHECKLIST_ITEMS.length - 1 && (
                <View style={[s.divider, { backgroundColor: t.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Save action is not yet available */}
        <MissingApiState title="Visit prep save unavailable" contract="existing API reusable" />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  bar:          { paddingHorizontal: 16 },
  content:      { paddingHorizontal: 16, paddingBottom: 80, gap: 12, marginTop: 8 },
  contextCard:  { padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  checklistCard:{ padding: 14, borderWidth: StyleSheet.hairlineWidth },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  checkbox:     { width: 20, height: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  divider:      { height: StyleSheet.hairlineWidth },
});
