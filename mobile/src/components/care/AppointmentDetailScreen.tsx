import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/Chip';
import { Button } from '../primitives/Button';
import { PressableCard } from '../primitives/PressableCard';
import { TopBar } from '../layout/TopBar';
import { IconButton } from '../primitives/IconButton';
import { ApiState, MissingApiState } from '../api/ApiState';
import {
  IconCalendar, IconClock, IconMapPin, IconVideo,
  IconPaperclip, IconCheck, ChevronRight, IconMore,
} from '../../icons';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate, formatTime } from '../../api/viewModels';

export function AppointmentDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = (Array.isArray(id) ? id[0] : id) ?? '';

  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(queryKeys.appointment(appointmentId), loadAppointments, { enabled: Boolean(appointmentId) });
  const appointment = appointments.data?.find((item) => item.id === appointmentId) ?? null;

  // More menu sheet state
  const [moreOpen, setMoreOpen] = useState(false);
  // Reschedule placeholder sheet state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  // Attachments placeholder sheet state
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  // Cancel confirmation state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!appointment) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await appointmentService.updateStatus(appointment.id, 'cancelled');
      setCancelOpen(false);
      router.back();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Unable to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  }

  // Determine if video join button should be shown
  const isVideoEligible =
    appointment &&
    (appointment as any).visit_type === 'video' &&
    (appointment.status === 'scheduled' || appointment.status === 'upcoming');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.topBarWrap}>
        <TopBar
          title="Appointment"
          left={
            <Text style={[typography.bodyMed, { color: t.brand }]} onPress={() => router.back()}>
              Back
            </Text>
          }
          right={
            <IconButton
              icon={<IconMore size={20} color={t.ink3} />}
              accessibilityLabel="More options"
              onPress={() => setMoreOpen(true)}
            />
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {appointments.isLoading && <ApiState title="Loading appointment" loading />}
        {appointments.error && (
          <ApiState
            title="Appointment unavailable"
            message={appointments.error.message}
            actionLabel="Retry"
            onAction={appointments.reload}
          />
        )}
        {!appointments.isLoading && !appointments.error && !appointment && (
          <ApiState
            title="Appointment not found"
            message="The backend does not expose a single-appointment endpoint yet, so this screen can only resolve records from the appointment list."
          />
        )}

        {appointment && (
          <>
            <LinearGradient
              colors={[t.brandDeep, t.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.hero, { borderRadius: t.radius.xl }]}
            >
              <Chip label={appointment.status} variant="brand" />
              <Text style={[typography.title, s.heroName]}>{appointment.doctor_name}</Text>
              <Text style={[typography.caption, s.heroSub]}>{appointment.specialty ?? 'Appointment'}</Text>
              <View style={s.heroRow}>
                <IconCalendar size={12} color="rgba(255,255,255,0.8)" />
                <Text style={s.heroMeta}>{formatDate(appointment.appointment_date)}</Text>
                <IconClock size={12} color="rgba(255,255,255,0.8)" />
                <Text style={s.heroMeta}>{formatTime(appointment.appointment_date)}</Text>
              </View>

              {isVideoEligible ? (
                <Button
                  label="Join video call"
                  variant="solid"
                  icon={<IconVideo size={14} color="#FFF" />}
                  style={[s.joinBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={() => router.push(`/care/video/${appointment.id}` as never)}
                />
              ) : (
                <View style={[s.joinBtn, s.videoUnavailable]}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                    Video visit not available for this appointment.
                  </Text>
                </View>
              )}
            </LinearGradient>

            <Text style={[typography.h3, { color: t.ink, marginBottom: t.space[2] }]}>Details</Text>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
              <DetailRow icon={<IconVideo size={14} color={t.ink3} />} label="Status" value={appointment.status} t={t} />
              <View style={[s.divider, { backgroundColor: t.border }]} />
              <DetailRow icon={<IconMapPin size={14} color={t.ink3} />} label="Location" value={appointment.clinic ?? 'Not specified'} t={t} />
              <View style={[s.divider, { backgroundColor: t.border }]} />
              <DetailRow icon={<IconClock size={14} color={t.ink3} />} label="Time" value={`${formatDate(appointment.appointment_date)} ${formatTime(appointment.appointment_date)}`} t={t} />
            </View>

            <Text style={[typography.h3, { color: t.ink, marginBottom: t.space[2] }]}>Reason for visit</Text>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
              <Text style={[typography.body, { color: t.ink2 }]}>{appointment.notes ?? (appointment as any).diagnosis ?? 'No notes on this appointment.'}</Text>
            </View>

            <Text style={[typography.h3, { color: t.ink, marginBottom: t.space[2] }]}>Attachments</Text>
            <MissingApiState title="General appointment attachments unavailable" contract="unclear and needs manual confirmation" />

            {appointment.has_prescription && (
              <PressableCard
                onPress={() => router.push(`/care/prescriptions/${(appointment as any).prescription_id ?? appointment.id}` as never)}
                style={[s.prepCard, { backgroundColor: t.brandSoft, borderRadius: t.radius.lg }]}
              >
                <IconPaperclip size={18} color={t.brand} />
                <View style={s.prepText}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>Prescription available</Text>
                  <Text style={[typography.caption, { color: t.ink3 }]}>Open verified prescription payload</Text>
                </View>
                <ChevronRight size={16} color={t.brand} />
              </PressableCard>
            )}

            <PressableCard
              onPress={() => router.push(`/care/prep/${appointment.id}` as never)}
              style={[s.prepCard, { backgroundColor: t.brandSoft, borderRadius: t.radius.lg }]}
            >
              <IconCheck size={18} color={t.brand} />
              <View style={s.prepText}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>Prepare for this visit</Text>
                <Text style={[typography.caption, { color: t.ink3 }]}>Checklist and questions can be linked to this visit</Text>
              </View>
              <ChevronRight size={16} color={t.brand} />
            </PressableCard>

            <View style={s.actions}>
              <Button
                label="Reschedule"
                variant="ghost"
                style={s.actionBtn}
                onPress={() => setRescheduleOpen(true)}
              />
              <Button
                label="Cancel"
                variant="ghost"
                style={[s.actionBtn, { borderColor: t.danger }]}
                onPress={() => setCancelOpen(true)}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* More options sheet */}
      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setMoreOpen(false)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 12 }]}>Options</Text>

          <Pressable style={[s.sheetRow, { borderColor: t.border }]} onPress={() => { setMoreOpen(false); setRescheduleOpen(true); }}>
            <Text style={[typography.body, { color: t.ink }]}>Reschedule</Text>
          </Pressable>
          <Pressable style={[s.sheetRow, { borderColor: t.border }]} onPress={() => { setMoreOpen(false); setCancelOpen(true); }}>
            <Text style={[typography.body, { color: t.danger }]}>Cancel appointment</Text>
          </Pressable>
          <Pressable style={[s.sheetRow, { borderColor: t.border }]} onPress={() => { setMoreOpen(false); setAttachmentsOpen(true); }}>
            <Text style={[typography.body, { color: t.ink }]}>Attachments</Text>
          </Pressable>
          <Pressable style={[s.sheetRow, { borderColor: t.border }]} onPress={() => setMoreOpen(false)}>
            <Text style={[typography.body, { color: t.ink3 }]}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Reschedule placeholder sheet */}
      <Modal visible={rescheduleOpen} transparent animationType="slide" onRequestClose={() => setRescheduleOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setRescheduleOpen(false)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <MissingApiState title="Reschedule appointment API not available yet." contract="reschedule endpoint not implemented" />
          <Button label="Close" variant="soft" onPress={() => setRescheduleOpen(false)} style={{ marginTop: 8 }} />
        </View>
      </Modal>

      {/* Attachments placeholder sheet */}
      <Modal visible={attachmentsOpen} transparent animationType="slide" onRequestClose={() => setAttachmentsOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setAttachmentsOpen(false)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <MissingApiState title="Attachments unavailable" contract="unclear and needs manual confirmation" />
          <Button label="Close" variant="soft" onPress={() => setAttachmentsOpen(false)} style={{ marginTop: 8 }} />
        </View>
      </Modal>

      {/* Cancel confirmation modal */}
      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => !cancelling && setCancelOpen(false)}>
        <View style={s.confirmOverlay}>
          <View style={[s.confirmBox, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
            <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Cancel appointment?</Text>
            <Text style={[typography.body, { color: t.ink3, marginBottom: 16 }]}>
              This action cannot be undone. The appointment will be marked as cancelled.
            </Text>
            {cancelError && (
              <Text style={[typography.caption, { color: t.danger, marginBottom: 12 }]}>{cancelError}</Text>
            )}
            {cancelling && <ActivityIndicator color={t.brand} style={{ marginBottom: 12 }} />}
            <View style={s.confirmActions}>
              <Button
                label="Keep"
                variant="ghost"
                style={s.actionBtn}
                onPress={() => { setCancelOpen(false); setCancelError(null); }}
                disabled={cancelling}
              />
              <Button
                label={cancelling ? 'Cancelling…' : 'Yes, cancel'}
                variant="solid"
                style={[s.actionBtn, { backgroundColor: t.danger }]}
                onPress={handleCancel}
                disabled={cancelling}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value, t }: { icon: React.ReactNode; label: string; value: string; t: any }) {
  return (
    <View style={s.detailRow}>
      {icon}
      <Text style={[typography.caption, { color: t.ink3, marginLeft: 8, flex: 1 }]}>{label}</Text>
      <Text style={[typography.bodyMed, { color: t.ink }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  topBarWrap:     { paddingHorizontal: 20 },
  scroll:         { paddingHorizontal: 20, paddingBottom: 80, gap: 12 },
  hero:           { padding: 20, gap: 6 },
  heroName:       { color: '#FFF', marginTop: 6 },
  heroSub:        { color: 'rgba(255,255,255,0.75)' },
  heroRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroMeta:       { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginRight: 8 },
  joinBtn:        { marginTop: 8 },
  videoUnavailable: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  card:           { padding: 14, borderWidth: StyleSheet.hairlineWidth },
  divider:        { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  detailRow:      { flexDirection: 'row', alignItems: 'center' },
  prepCard:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  prepText:       { flex: 1 },
  actions:        { flexDirection: 'row', gap: 10 },
  actionBtn:      { flex: 1 },
  backdrop:       { flex: 1 },
  sheet:          { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  sheetRow:       { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  confirmBox:     { width: '100%', padding: 20, borderWidth: StyleSheet.hairlineWidth },
  confirmActions: { flexDirection: 'row', gap: 10 },
});
