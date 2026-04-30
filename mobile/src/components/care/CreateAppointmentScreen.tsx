import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';
import { TopBar } from '../layout/TopBar';
import { ApiState, MissingApiState } from '../api/ApiState';
import { appointmentService } from '../../api/services';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import {
  IconStethoscope, IconCalendar, IconClock, IconVideo, IconMapPin, ChevronRight,
} from '../../icons';

type VisitType = 'video' | 'in-person';

export function CreateAppointmentScreen() {
  const t = useTheme();
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

  const inputStyle = {
    backgroundColor: t.card,
    borderColor: t.borderStrong,
    color: t.ink,
    borderRadius: t.radius.md,
  };

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
        notes: notes.trim() ? `${notes.trim()}\nVisit type: ${visitType}` : `Visit type: ${visitType}`,
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
          title="New Appointment"
          left={
            <Text style={[typography.bodyMed, { color: t.primary }]} onPress={() => !saving && router.back()}>
              ← Back
            </Text>
          }
          right={
            <Text
              style={[typography.bodyMed, { color: saving ? t.ink4 : t.brand }]}
              onPress={saving ? undefined : handleCreate}
            >
              {saving ? 'Saving…' : 'Save'}
            </Text>
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {error && <ApiState title="Could not book appointment" message={error} />}

        {/* Specialty */}
        <FieldLabel label="Specialty" t={t} />
        <View style={[s.inputRow, inputStyle]}>
          <IconStethoscope size={16} color={t.ink3} />
          <TextInput
            style={[s.input, { color: t.ink }]}
            placeholder="e.g. Cardiology"
            placeholderTextColor={t.ink4}
            value={specialty}
            onChangeText={setSpecialty}
            editable={!saving}
          />
        </View>

        {/* Doctor */}
        <FieldLabel label="Doctor / Provider" t={t} required />
        <Pressable
          onPress={() => setDoctorSheetOpen(true)}
          style={[s.inputRow, inputStyle, fieldErrors.doctor ? { borderColor: t.danger } : {}]}
        >
          <IconStethoscope size={16} color={t.ink3} />
          <TextInput
            style={[s.input, { color: t.ink }]}
            placeholder="Doctor name"
            placeholderTextColor={t.ink4}
            value={doctor}
            onChangeText={(v) => {
              setDoctor(v);
              if (v.trim()) setFieldErrors((prev) => ({ ...prev, doctor: undefined }));
            }}
            editable={!saving}
          />
          <ChevronRight size={14} color={t.ink4} />
        </Pressable>
        {fieldErrors.doctor && <FormMessage message={fieldErrors.doctor} t={t} />}

        <FieldLabel label="Clinic / Location" t={t} />
        <View style={[s.inputRow, inputStyle]}>
          <IconMapPin size={14} color={t.ink3} />
          <TextInput
            style={[s.input, { color: t.ink }]}
            placeholder="Clinic or hospital"
            placeholderTextColor={t.ink4}
            value={clinic}
            onChangeText={setClinic}
            editable={!saving}
          />
        </View>

        {/* Date / Time row */}
        <View style={s.dateTimeRow}>
          <View style={s.dateTimeCell}>
            <FieldLabel label="Date" t={t} required />
            <View style={[s.inputRow, inputStyle, fieldErrors.date ? { borderColor: t.danger } : {}]}>
              <IconCalendar size={14} color={t.ink3} />
              <TextInput
                style={[s.input, { color: t.ink }]}
                placeholder="e.g. Apr 28"
                placeholderTextColor={t.ink4}
                value={date}
                onChangeText={(v) => {
                  setDate(v);
                  if (v.trim()) setFieldErrors((prev) => ({ ...prev, date: undefined }));
                }}
                editable={!saving}
              />
            </View>
            {fieldErrors.date && <FormMessage message={fieldErrors.date} t={t} />}
          </View>
          <View style={s.dateTimeCell}>
            <FieldLabel label="Time" t={t} />
            <View style={[s.inputRow, inputStyle]}>
              <IconClock size={14} color={t.ink3} />
              <TextInput
                style={[s.input, { color: t.ink }]}
                placeholder="e.g. 2:00 PM"
                placeholderTextColor={t.ink4}
                value={time}
                onChangeText={setTime}
                editable={!saving}
              />
            </View>
          </View>
        </View>

        {/* Visit type */}
        <FieldLabel label="Visit type" t={t} />
        <View style={s.typeRow}>
          {(['video', 'in-person'] as VisitType[]).map((vt) => (
            <Pressable
              key={vt}
              onPress={() => !saving && setVisitType(vt)}
              style={[
                s.typeBtn,
                {
                  flex: 1,
                  backgroundColor: visitType === vt ? t.brandSoft : t.card,
                  borderColor: visitType === vt ? t.brand : t.borderStrong,
                  borderRadius: t.radius.md,
                },
              ]}
            >
              {vt === 'video' ? <IconVideo size={14} color={visitType === vt ? t.brand : t.ink3} />
                              : <IconMapPin size={14} color={visitType === vt ? t.brand : t.ink3} />}
              <Text style={[typography.bodyMed, { color: visitType === vt ? t.brand : t.ink3, marginLeft: 6 }]}>
                {vt === 'video' ? 'Video' : 'In-person'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Notes */}
        <FieldLabel label="Notes (optional)" t={t} />
        <TextInput
          style={[s.textarea, inputStyle, { color: t.ink }]}
          placeholder="e.g. Follow-up on BP medication…"
          placeholderTextColor={t.ink4}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!saving}
        />

        <Button
          label={saving ? 'Booking…' : 'Book appointment'}
          variant="solid"
          onPress={handleCreate}
          style={s.submitBtn}
          disabled={saving}
        />
      </ScrollView>

      {/* Doctor search not available sheet */}
      <Modal visible={doctorSheetOpen} transparent animationType="slide" onRequestClose={() => setDoctorSheetOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setDoctorSheetOpen(false)} />
        <View style={[s.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <MissingApiState title="Provider search not yet available" contract="provider search API not implemented" />
          <Button label="Close" variant="soft" onPress={() => setDoctorSheetOpen(false)} style={{ marginTop: 8 }} />
        </View>
      </Modal>
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

function FieldLabel({ label, t, required }: { label: string; t: any; required?: boolean }) {
  return (
    <Text style={[typography.caption, { color: t.ink3, marginBottom: 6, marginTop: 12 }]}>
      {label}{required ? <Text style={{ color: t.danger }}> *</Text> : null}
    </Text>
  );
}

function FormMessage({ message, t }: { message: string; t: any }) {
  return (
    <Text style={[typography.caption, { color: t.danger, marginTop: 4 }]}>{message}</Text>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  topBarWrap:  { paddingHorizontal: 20 },
  scroll:      { paddingHorizontal: 20, paddingBottom: 80 },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateTimeCell:{ flex: 1 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, gap: 8 },
  input:       { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  typeRow:     { flexDirection: 'row', gap: 10 },
  typeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1.5 },
  textarea:    { padding: 12, borderWidth: 1, minHeight: 88, fontSize: 14, fontFamily: 'Inter_400Regular' },
  submitBtn:   { marginTop: 20 },
  backdrop:    { flex: 1 },
  sheet:       { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
});
