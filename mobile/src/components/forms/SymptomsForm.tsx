import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';
import { ApiState } from '../api/ApiState';
import { visitBriefService } from '../../api/services';

const SYMPTOM_OPTIONS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea',
  'Chest pain', 'Shortness of breath', 'Dizziness', 'Sore throat', 'Back pain',
];

export function SymptomsForm() {
  const t = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [triageBucket, setTriageBucket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleSymptom(s: string) {
    setSelected(prev => prev.includes(s) ? prev.filter(v => v !== s) : [...prev, s]);
  }

  async function handleSubmit() {
    if (selected.length === 0) { setError('Select at least one symptom.'); return; }
    setSaving(true);
    setError(null);
    try {
      const brief = await visitBriefService.create({
        visit_type: severity >= 7 ? 'urgent_walkin' : 'gp_routine',
        title: 'Mobile symptom intake',
      });
      const topSymptoms = selected.slice(0, 5);
      for (const symptom of topSymptoms) {
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
        <Text style={[typography.h3, { color: t.ink }]}>Symptoms logged</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
          Your symptom report has been recorded.
        </Text>
        {triageBucket && (
          <Text style={[typography.caption, { color: t.ink3, marginTop: 6, textAlign: 'center' }]}>
            Triage: {triageBucket.replace(/_/g, ' ')}
          </Text>
        )}
        <Button label="Done" variant="solid" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 80 }]}>
      {error && <ApiState title="Validation error" message={error} />}

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>SYMPTOMS</Text>
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

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>SEVERITY</Text>
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
        {severity <= 3 ? 'Mild' : severity <= 6 ? 'Moderate' : 'Severe'} · {severity}/10
      </Text>

      <Text style={[typography.micro, s.sectionLabel, { color: t.ink3 }]}>NOTES (OPTIONAL)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Describe when symptoms started, triggers, etc."
        placeholderTextColor={t.ink4}
        multiline
        numberOfLines={4}
        style={[s.notes, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.md, color: t.ink }]}
      />

      <Button label={saving ? 'Submitting...' : 'Submit report'} variant="solid" onPress={saving ? undefined : handleSubmit} style={[{ marginTop: 20 }, saving && { opacity: 0.4 }]} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

function inferConcernCategory(symptom: string): 'pain' | 'fever' | 'resp' | 'mental' | 'other' {
  const value = symptom.toLowerCase();
  if (value.includes('fever')) return 'fever';
  if (value.includes('cough') || value.includes('shortness of breath') || value.includes('sore throat')) return 'resp';
  if (value.includes('pain') || value.includes('headache') || value.includes('back')) return 'pain';
  if (value.includes('fatigue') || value.includes('dizziness')) return 'mental';
  return 'other';
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
