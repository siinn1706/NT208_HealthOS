import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TAB_BAR_CONTENT_HEIGHT } from '../nav/tab-bar-metrics';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/chip';
import { Button } from '../primitives/button';
import { PressableCard } from '../primitives/pressable-card';
import { BottomSheet } from '../primitives/sheet/bottom-sheet';
import { TopBar } from '../layout/top-bar';
import { IconButton } from '../primitives/icon-button';
import { ApiState, MissingApiState } from '../api/api-state';
import {
  IconCalendar, IconClock, IconMapPin, IconVideo,
  IconPaperclip, IconCheck, ChevronRight, IconMore,
} from '../../icons';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { formatDate, formatTime } from '../../api/viewModels';
import { AppointmentRescheduleSheet } from './appointment-reschedule-sheet';
import { PrescriptionFilesCard } from './prescription-files-card';

export function AppointmentDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = (Array.isArray(id) ? id[0] : id) ?? '';

  const loadAppointment = useCallback(() => appointmentService.detail(appointmentId), [appointmentId]);
  const appointmentQuery = useApiQuery(queryKeys.appointment(appointmentId), loadAppointment, { enabled: Boolean(appointmentId) });
  const appointment = appointmentQuery.data;

  // More menu sheet state
  const [moreOpen, setMoreOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  // Attachments sheet state
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
      invalidateApiQuery(queryKeys.appointments);
      invalidateApiQuery(queryKeys.appointment(appointment.id));
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
    appointment.visit_type === 'video' &&
    (appointment.status === 'scheduled' || appointment.status === 'upcoming');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.topBarWrap}>
        <TopBar
          title={i18n('care.appointmentDetail')}
          left={
            <Text style={[typography.bodyMed, { color: t.brand }]} onPress={() => router.back()}>
              {i18n('common.back')}
            </Text>
          }
          right={
            <IconButton
              icon={<IconMore size={20} color={t.ink3} />}
              accessibilityLabel={i18n('common.more')}
              onPress={() => setMoreOpen(true)}
            />
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16 }]}>
        {appointmentQuery.isLoading && <ApiState title={i18n('care.loadingAppointments')} loading />}
        {appointmentQuery.error && (
          <ApiState
            title={i18n('care.appointmentsUnavailable')}
            message={appointmentQuery.error.message}
            actionLabel={i18n('common.retry')}
            onAction={appointmentQuery.reload}
          />
        )}
        {!appointmentQuery.isLoading && !appointmentQuery.error && !appointment && (
          <ApiState
            title={i18n('care.noAppointments')}
            message="No appointment found for this id."
          />
        )}

        {appointment && (
          <>
            <LinearGradient
              colors={[t.brandDeep, t.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.hero, { borderRadius: t.radius.xl, overflow: 'hidden' }]}
            >
              {/* Decorative depth circles */}
              <View style={s.glowCircle1} pointerEvents="none" />
              <View style={s.glowCircle2} pointerEvents="none" />
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

            {/* Date / time 2-column */}
            <View style={s.dateTimeRow}>
              <View style={[s.dtCard, { backgroundColor: t.bgElev, borderRadius: t.radius.md }]}>
                <IconCalendar size={16} color={t.brand} />
                <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>{i18n('forms.date')}</Text>
                <Text style={[typography.h3, { color: t.ink }]}>{formatDate(appointment.appointment_date)}</Text>
              </View>
              <View style={[s.dtCard, { backgroundColor: t.bgElev, borderRadius: t.radius.md }]}>
                <IconClock size={16} color={t.brand} />
                <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>{i18n('forms.time')}</Text>
                <Text style={[typography.h3, { color: t.ink }]}>{formatTime(appointment.appointment_date)}</Text>
              </View>
            </View>

            <Text style={[typography.h3, { color: t.ink, marginBottom: t.space[2] }]}>{i18n('care.general')}</Text>
            <View style={[s.card, { backgroundColor: t.card, borderRadius: t.radius.lg }]}>
              <DetailRow icon={<IconVideo size={14} color={t.ink3} />} label="Status" value={appointment.status} t={t} />
              <View style={[s.divider, { backgroundColor: t.border }]} />
              <DetailRow icon={<IconMapPin size={14} color={t.ink3} />} label="Location" value={appointment.clinic ?? 'Not specified'} t={t} />
            </View>

            <Text style={[typography.h3, { color: t.ink, marginBottom: t.space[2] }]}>Reason for visit</Text>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}>
              <Text style={[typography.body, { color: t.ink2 }]}>{appointment.notes ?? appointment.diagnosis ?? 'No notes on this appointment.'}</Text>
            </View>

            <Text style={[typography.h3, { color: t.ink, marginBottom: t.space[2] }]}>{i18n('care.attachments')}</Text>
            {appointment.has_prescription ? (
              <PrescriptionFilesCard
                appointmentId={appointment.id}
                showTitle={false}
                helperText="Files are stored through the verified prescription asset contract for this appointment."
              />
            ) : (
              <MissingApiState
                title="Appointment attachments unavailable"
                contract="Generic appointment upload/storage API is not implemented; only prescription files have a Core storage contract."
              />
            )}

            {appointment.has_prescription && (
              <PressableCard
                onPress={() => router.push(`/care/prescriptions/${appointment.id}` as never)}
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
                label={i18n('common.cancel')}
                variant="ghost"
                labelColor={t.danger}
                style={[s.actionBtn, { borderColor: t.danger }]}
                onPress={() => setCancelOpen(true)}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* More options sheet */}
      <BottomSheet visible={moreOpen} onClose={() => setMoreOpen(false)}>
        <View style={[s.sheetInner, { paddingBottom: insets.bottom + 16 }]}>
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
        </View>
      </BottomSheet>

      <AppointmentRescheduleSheet
        visible={rescheduleOpen}
        appointment={appointment}
        onClose={() => setRescheduleOpen(false)}
      />

      {/* Attachments sheet */}
      <BottomSheet visible={attachmentsOpen} onClose={() => setAttachmentsOpen(false)}>
        <View style={[s.sheetInner, { paddingBottom: insets.bottom + 16 }]}>
          {attachmentsOpen && (
            appointment?.has_prescription ? (
              <PrescriptionFilesCard
                appointmentId={appointment.id}
                showTitle={false}
                helperText="Prescription files are backed by the appointment prescription asset API."
              />
            ) : (
              <MissingApiState
                title="Attachments unavailable"
                contract="Generic appointment upload/storage API is not implemented; only prescription files have a Core storage contract."
              />
            )
          )}
          <Button label={i18n('common.close')} variant="soft" onPress={() => setAttachmentsOpen(false)} style={{ marginTop: 8 }} />
        </View>
      </BottomSheet>

      {/* Cancel confirmation modal */}
      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => !cancelling && setCancelOpen(false)}>
        <View style={s.confirmOverlay}>
          <View style={[s.confirmBox, { backgroundColor: t.card, borderRadius: t.radius.xl, ...t.shadows.modal }]}>
            {/* Danger icon tile */}
            <View style={s.confirmIconWrap}>
              <View style={[s.confirmIconTile, { backgroundColor: t.dangerSoft }]}>
                <Text style={{ fontSize: 24 }}>✕</Text>
              </View>
            </View>
            {/* Record pill */}
            {appointment && (
              <View style={s.confirmMetaWrap}>
                <View style={[s.confirmMetaPill, { backgroundColor: t.chip }]}>
                  <Text style={[typography.caption, { color: t.ink3 }]} numberOfLines={1}>
                    {appointment.doctor_name}
                  </Text>
                </View>
              </View>
            )}
            <Text style={[typography.h3, { color: t.ink, marginBottom: 8, textAlign: 'center' }]}>
              Cancel appointment?
            </Text>
            <Text style={[typography.body, { color: t.ink3, marginBottom: 20, textAlign: 'center', lineHeight: 19 }]}>
              This action cannot be undone. The appointment will be marked as cancelled.
            </Text>
            {cancelError && (
              <Text style={[typography.caption, { color: t.danger, marginBottom: 12, textAlign: 'center' }]}>{cancelError}</Text>
            )}
            {cancelling && <ActivityIndicator color={t.danger} style={{ marginBottom: 12 }} />}
            {/* Vertical actions — destructive first */}
            <View style={s.confirmActionsV}>
              <Button
                label={cancelling ? 'Cancelling…' : i18n('common.confirm')}
                variant="solid"
                style={[s.confirmBtn, { backgroundColor: t.danger }]}
                onPress={handleCancel}
                disabled={cancelling}
              />
              <Button
                label={i18n('common.cancel')}
                variant="ghost"
                style={s.confirmBtn}
                onPress={() => { setCancelOpen(false); setCancelError(null); }}
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
  scroll:         { paddingHorizontal: 20, gap: 12 },
  hero:           { padding: 20, gap: 6 },
  glowCircle1:   { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.10)', right: -30, top: -30 },
  glowCircle2:   { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.06)', right: 20, bottom: -20 },
  heroName:       { color: '#FFF', marginTop: 6 },
  heroSub:        { color: 'rgba(255,255,255,0.75)' },
  heroRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroMeta:       { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginRight: 8 },
  joinBtn:        { marginTop: 12 },
  videoUnavailable: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  card:           { padding: 16 },
  divider:        { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  detailRow:      { flexDirection: 'row', alignItems: 'center' },
  dateTimeRow:    { flexDirection: 'row', gap: 10 },
  dtCard:         { flex: 1, padding: 12, gap: 2 },
  prepCard:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  prepText:       { flex: 1 },
  actions:        { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn:      { flex: 1 },
  sheetInner:     { paddingHorizontal: 20, paddingTop: 8, gap: 0 },
  sheetRow:       { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  confirmOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  confirmBox:       { width: '100%', padding: 22 },
  confirmIconWrap:  { alignItems: 'center', marginBottom: 12 },
  confirmIconTile:  { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmMetaWrap:  { alignItems: 'center', marginBottom: 10 },
  confirmMetaPill:  { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  confirmActionsV:  { gap: 8 },
  confirmBtn:       { height: 52 },
});
