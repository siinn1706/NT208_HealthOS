import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { nightPalette as nt } from '../../theme/palettes';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState, MissingApiState } from '../api/api-state';
import { ChevronLeft, IconChat, IconVideo } from '../../icons';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate, formatTime } from '../../api/viewModels';

const VIDEO_CONTRACT_GAP =
  'Core exposes appointment scheduling/status only; no video-session, meeting URL, room token, or media service contract exists';

export function JoinVideoVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t: i18n } = useTranslation();
  const apptId = (Array.isArray(id) ? id[0] : id) ?? '';
  const loadAppointment = useCallback(() => appointmentService.detail(apptId), [apptId]);
  const appointmentQuery = useApiQuery(queryKeys.appointment(apptId), loadAppointment, { enabled: Boolean(apptId) });
  const appointment = appointmentQuery.data ?? null;

  const unavailableTitle = appointment?.visit_type === 'video'
    ? 'Video visit unavailable'
    : 'No video visit for this appointment';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel={i18n('common.back')}>
          <ChevronLeft size={22} color={nt.ink} />
        </Pressable>
        <Text style={[typography.bodyMed, { color: nt.ink }]}>{i18n('care.joinVideoVisit')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <LinearGradient colors={['#1a2130', '#0B0F14']} style={s.contextCard}>
          <View style={s.videoBadge}>
            <IconVideo size={18} color={nt.ink} />
          </View>
          <Text style={[typography.title, { color: nt.ink, marginTop: 14 }]}>
            {appointment?.doctor_name ?? 'Video appointment'}
          </Text>
          <Text style={[typography.caption, { color: nt.ink3, marginTop: 4 }]}>
            {appointment
              ? `${appointment.specialty ?? 'Appointment'} · ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.appointment_date)}`
              : 'Loading appointment context from Core'}
          </Text>
        </LinearGradient>

        {appointmentQuery.isLoading && <ApiState title="Loading appointment" loading />}
        {appointmentQuery.error && (
          <ApiState
            title="Appointment unavailable"
            message={appointmentQuery.error.message}
            actionLabel={i18n('common.retry')}
            onAction={appointmentQuery.reload}
          />
        )}

        {!appointmentQuery.isLoading && !appointmentQuery.error && (
          <MissingApiState title={unavailableTitle} contract={VIDEO_CONTRACT_GAP} />
        )}

        <View style={s.actions}>
          {apptId && (
            <Button
              label="Open appointment"
              variant="solid"
              onPress={() => router.push(`/care/appointment/${apptId}` as never)}
            />
          )}
          <Button
            label="Open chat"
            variant="ghost"
            icon={<IconChat size={16} color={nt.ink} />}
            onPress={() => router.push('/chat' as never)}
            labelColor={nt.ink}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0D13' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 14 },
  contextCard: { borderRadius: 18, padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  videoBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  actions: { gap: 10 },
});
