import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { SegmentedControl } from '../primitives/input/segmented-control';
import { BottomSheet } from '../primitives/sheet/bottom-sheet';
import { TopBar } from '../layout/top-bar';
import { ApiState, MissingApiState } from '../api/api-state';
import { appointmentService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { IconStethoscope, IconCalendar, IconClock, IconMapPin } from '../../icons';

type VisitType = 'video' | 'in-person';
const VISIT_LABELS = ['Video', 'In-person'];
const VISIT_VALUES: VisitType[] = ['video', 'in-person'];

export function CreateAppointmentScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [specialty, setSpecialty] = useState('');
  const [doctor, setDoctor]       = useState('');
  const [clinic, setClinic]       = useState('');
  const [date, setDate]           = useState('');
  const [time, setTime]           = useState('');
  const [visitType, setVisitType] = useState<VisitType>('video');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ doctor?: string; date?: string }>({});
  const [doctorSheetOpen, setDoctorSheetOpen] = useState(false);

  function validate(): boolean {
    const errs: { doctor?: string; date?: string } = {};
    if (!doctor.trim()) errs.doctor = 'Doctor / Provider is required.';
    if (!date.trim()) errs.date = 'Date is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      await appointmentService.create({
        appointment_date: toIsoAppointment(date, time),
        doctor_name: doctor.trim(),
        specialty: specialty.trim() || null,
        clinic: clinic.trim() || (visitType === 'video' ? 'Video visit' : null),
        reason: notes.trim() || null,
        notes: notes.trim()
          ? `${notes.trim()}\nVisit type: ${visitType}`
          : `Visit type: ${visitType}`,
      });
      invalidateApiQuery(queryKeys.appointments);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to book appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={s.topBarWrap}>
        <TopBar
          title={i18n('care.createAppointment')}
          left={
            <Text style={[typography.bodyMed, { color: t.brand }]} onPress={() => !saving && router.back()}>
              ← {i18n('common.back')}
            </Text>
          }
          right={
            <Text
              style={[typography.bodyMed, { color: saving ? t.ink4 : t.brand }]}
              onPress={saving ? undefined : handleCreate}
            >
              {saving ? i18n('common.working') : i18n('common.save')}
            </Text>
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {error && <ApiState title="Could not book appointment" message={error} />}

        <Input
          label="Specialty"
          leadingIcon={<IconStethoscope size={16} color={t.ink3} />}
          placeholder="e.g. Cardiology"
          value={specialty}
          onChangeText={setSpecialty}
          editable={!saving}
        />

        <Input
          label="Doctor / Provider *"
          leadingIcon={<IconStethoscope size={16} color={t.ink3} />}
          trailingText="Search"
          onTrailingPress={() => setDoctorSheetOpen(true)}
          placeholder="Doctor name"
          value={doctor}
          onChangeText={(v) => {
            setDoctor(v);
            if (v.trim()) setFieldErrors((prev) => ({ ...prev, doctor: undefined }));
          }}
          error={fieldErrors.doctor}
          editable={!saving}
        />

        <Input
          label="Clinic / Location"
          leadingIcon={<IconMapPin size={14} color={t.ink3} />}
          placeholder="Clinic or hospital"
          value={clinic}
          onChangeText={setClinic}
          editable={!saving}
        />

        {/* Date / Time row */}
        <View style={s.dateTimeRow}>
          <View style={s.dateTimeCell}>
            <Input
              label="Date *"
              leadingIcon={<IconCalendar size={14} color={t.ink3} />}
              placeholder="e.g. Apr 28"
              value={date}
              onChangeText={(v) => {
                setDate(v);
                if (v.trim()) setFieldErrors((prev) => ({ ...prev, date: undefined }));
              }}
              error={fieldErrors.date}
              editable={!saving}
            />
          </View>
          <View style={s.dateTimeCell}>
            <Input
              label="Time"
              leadingIcon={<IconClock size={14} color={t.ink3} />}
              placeholder="e.g. 2:00 PM"
              value={time}
              onChangeText={setTime}
              editable={!saving}
            />
          </View>
        </View>

        {/* Visit type */}
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 6 }]}>{i18n('forms.category')}</Text>
        <SegmentedControl
          options={VISIT_LABELS}
          value={VISIT_LABELS[VISIT_VALUES.indexOf(visitType)]}
          onChange={(opt) => {
            const idx = VISIT_LABELS.indexOf(opt);
            if (idx !== -1) setVisitType(VISIT_VALUES[idx]);
          }}
        />

        {/* Notes — multiline, styled to match Input */}
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 6 }]}>{i18n('forms.notes')} ({i18n('forms.optional')})</Text>
        <View style={[s.textareaWrap, { borderColor: t.border, borderRadius: t.radius.md, backgroundColor: t.card }]}>
          <TextInput
            style={[typography.body, s.textarea, { color: t.ink }]}
            placeholder="e.g. Follow-up on BP medication…"
            placeholderTextColor={t.ink4}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!saving}
          />
        </View>

        <Button
          label={saving ? i18n('common.working') : i18n('care.bookNow')}
          variant="solid"
          onPress={handleCreate}
          style={s.submitBtn}
          disabled={saving}
        />
      </ScrollView>

      <BottomSheet visible={doctorSheetOpen} onClose={() => setDoctorSheetOpen(false)}>
        <View style={[s.sheetInner, { paddingBottom: insets.bottom + 16 }]}>
          <MissingApiState title="Provider search not yet available" contract="provider search API not implemented" />
          <Button label={i18n('common.close')} variant="soft" onPress={() => setDoctorSheetOpen(false)} style={{ marginTop: 8 }} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function toIsoAppointment(date: string, time: string) {
  const raw = `${date.trim()} ${time.trim()}`.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Enter a valid appointment date and time.');
  }
  return parsed.toISOString();
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  topBarWrap:   { paddingHorizontal: 20 },
  scroll:       { paddingHorizontal: 20, paddingBottom: 80, gap: 12 },
  dateTimeRow:  { flexDirection: 'row', gap: 10 },
  dateTimeCell: { flex: 1 },
  textareaWrap: { borderWidth: 1, overflow: 'hidden' },
  textarea:     { padding: 14, minHeight: 96 },
  submitBtn:    { marginTop: 16 },
  sheetInner:   { paddingHorizontal: 20, paddingTop: 8 },
});
