import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Appointment } from '../../../../shared/api-contracts';
import { appointmentService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { IconCalendar, IconClock } from '../../icons';
import { ApiState } from '../api/api-state';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../primitives/sheet/bottom-sheet';
import {
  formatAppointmentDateInput,
  formatAppointmentTimeInput,
  toIsoAppointment,
} from './appointment-date-time';

export function AppointmentRescheduleSheet({
  visible,
  appointment,
  onClose,
}: {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !appointment) return;
    setDate(formatAppointmentDateInput(appointment.appointment_date));
    setTime(formatAppointmentTimeInput(appointment.appointment_date));
    setError(null);
    setSuccess(null);
  }, [appointment, visible]);

  async function saveReschedule() {
    if (!appointment) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await appointmentService.update(appointment.id, {
        appointment_date: toIsoAppointment(date, time),
      });
      invalidateApiQuery(queryKeys.appointments);
      invalidateApiQuery(queryKeys.appointment(appointment.id));
      setSuccess('Appointment rescheduled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reschedule appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 18 }]} showsVerticalScrollIndicator={false}>
        <Text style={[typography.h3, { color: t.ink }]}>Reschedule appointment</Text>
        <Text style={[typography.caption, styles.copy, { color: t.ink3 }]}>
          Update the date and time saved for this appointment.
        </Text>

        <View style={styles.row}>
          <Input
            label={i18n('forms.date')}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            leadingIcon={<IconCalendar size={14} color={t.ink3} />}
            disabled={saving}
            style={styles.field}
          />
          <Input
            label={i18n('forms.time')}
            value={time}
            onChangeText={setTime}
            placeholder="HH:mm"
            leadingIcon={<IconClock size={14} color={t.ink3} />}
            disabled={saving}
            style={styles.field}
          />
        </View>

        {success && <Text style={[typography.caption, { color: t.success }]}>{success}</Text>}
        {error && <ApiState title="Unable to reschedule appointment" message={error} />}

        <View style={styles.actions}>
          <Button label={i18n('common.close')} variant="ghost" onPress={onClose} disabled={saving} style={styles.actionBtn} />
          <Button
            label={saving ? 'Saving...' : 'Save reschedule'}
            variant="solid"
            onPress={saveReschedule}
            disabled={saving || !appointment}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  copy: { marginTop: -4 },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1 },
});
