import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/button';
import { ApiState } from '../api/api-state';
import { appointmentService, visitBriefService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { SymptomsFormAppointmentPicker } from './symptoms-form-appointment-picker';
import {
  firstParam,
  formatSymptomAppointmentLabel,
  inferConcernCategory,
  STANDALONE_SYMPTOM_TARGET,
  SYMPTOM_OPTIONS,
  upcomingSymptomAppointments,
} from './symptoms-form-state';

export function SymptomsForm() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const params = useLocalSearchParams<{ appointmentId?: string | string[]; attach?: string | string[] }>();
  const routeAppointmentId = firstParam(params.appointmentId) ?? firstParam(params.attach);
  const [selected, setSelected] = useState<string[]>([]);
  const [attachTarget, setAttachTarget] = useState<string | null>(routeAppointmentId ?? null);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [triageBucket, setTriageBucket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(() => appointmentService.list({ limit: 50 }), []);
  const appointments = useApiQuery(queryKeys.appointments, loadAppointments);
  const appointmentOptions = useMemo(
    () => upcomingSymptomAppointments(appointments.data),
    [appointments.data],
  );
  const selectedAppointmentId = attachTarget && attachTarget !== STANDALONE_SYMPTOM_TARGET ? attachTarget : null;
  const selectedAppointment = useMemo(
    () => appointmentOptions.find((appointment) => appointment.id === selectedAppointmentId) ?? null,
    [appointmentOptions, selectedAppointmentId],
  );

  useEffect(() => {
    setAttachTarget(routeAppointmentId ?? null);
  }, [routeAppointmentId]);

  function toggleSymptom(s: string) {
    setSelected(prev => prev.includes(s) ? prev.filter(v => v !== s) : [...prev, s]);
  }

  async function handleSubmit() {
    if (selected.length === 0) { setError('Select at least one symptom.'); return; }
    if (!attachTarget) { setError(i18n('forms.selectVisitTarget')); return; }
    setSaving(true);
    setError(null);
    try {
      const brief = await visitBriefService.create({
        visit_type: severity >= 7 ? 'urgent_walkin' : 'gp_routine',
        title: selectedAppointmentId
          ? `Mobile symptom intake: ${formatSymptomAppointmentLabel(selectedAppointment)}`
          : 'Mobile symptom intake',
        attach_to_appointment_id: selectedAppointmentId,
      });
      for (const symptom of selected) {
        await visitBriefService.addSymptom(brief.id, {
          concern_text: symptom,
          concern_category: inferConcernCategory(symptom),
          severity_0_10: severity,
          context: notes.trim() ? { notes: notes.trim() } : undefined,
        });
      }
      const triage = await visitBriefService.routeNow(brief.id);
      setTriageBucket(triage.bucket);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit symptoms.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <View style={s.center}>
        <Text style={[typography.h3, { color: t.ink }]}>{i18n('forms.symptomsLogged')}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
          {i18n('forms.symptomsLoggedMessage')}
        </Text>
        {triageBucket && (
          <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
            {i18n('forms.triage')}: {triageBucket.replace(/_/g, ' ')}
          </Text>
        )}
        <Button label={i18n('common.done')} variant="solid" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
      {error && <ApiState title={i18n('forms.validationError')} message={error} />}

      <SymptomsFormAppointmentPicker
        appointments={appointmentOptions}
        selectedTarget={attachTarget}
        loading={appointments.isLoading}
        error={appointments.error}
        onRetry={() => { void appointments.reload(); }}
        onSelect={setAttachTarget}
      />

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>{i18n('forms.symptomsLabel')}</Text>
      <View style={s.chipGrid}>
        {SYMPTOM_OPTIONS.map(opt => {
          const active = selected.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => toggleSymptom(opt)}
              style={[
                s.chip,
                {
                  borderRadius: t.radius.pill,
                  borderColor: active ? t.brand : t.border,
                  backgroundColor: active ? t.brandSoft : t.card,
                },
              ]}
            >
              <Text style={[typography.caption, { color: active ? t.brand : t.ink2 }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>{i18n('forms.severityLabel')}</Text>
      <View style={s.severityRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const active = severity === n;
          const color = n <= 3 ? t.success : n <= 6 ? t.warning : t.danger;
          return (
            <Pressable
              key={n}
              onPress={() => setSeverity(n)}
              style={[
                s.severityCell,
                {
                  borderRadius: t.radius.sm,
                  backgroundColor: active ? color : `${color}18`,
                  borderWidth: active ? 0 : 1,
                  borderColor: `${color}40`,
                },
              ]}
            >
              <Text style={[typography.caption, { color: active ? '#fff' : color, fontWeight: '600' }]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[typography.caption, { color: t.ink4, marginTop: 4 }]}>
        {severity <= 3 ? i18n('forms.mild') : severity <= 6 ? i18n('forms.moderate') : i18n('forms.severe')} · {severity}/10
      </Text>

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>{i18n('forms.notesOptional')}</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder={i18n('forms.notesPlaceholder')}
        placeholderTextColor={t.ink4}
        multiline
        numberOfLines={4}
        style={[s.notes, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.md, color: t.ink }]}
      />

      <Button label={saving ? i18n('forms.submitting') : i18n('forms.submitReport')} variant="solid" onPress={saving ? undefined : handleSubmit} style={[{ marginTop: 20 }, saving && { opacity: 0.4 }]} />
      <Button label={i18n('common.cancel')} variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content:      { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  chipGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  severityRow:  { flexDirection: 'row', gap: 6 },
  severityCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  notes:        { borderWidth: StyleSheet.hairlineWidth, padding: 12, height: 96, textAlignVertical: 'top', fontSize: 14 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
