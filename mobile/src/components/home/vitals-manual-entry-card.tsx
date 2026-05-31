import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input/input';
import { ApiState } from '../api/api-state';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { healthMetricService, type HealthMetricCreateBody } from '../../api/services/health-metric-service';

type DraftMetric = Pick<HealthMetricCreateBody, 'metric_type' | 'unit' | 'value'>;

function parseNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function inRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}

function buildDrafts(heartRateText: string, systolicText: string, diastolicText: string) {
  const heartRate = parseNumber(heartRateText);
  const systolic = parseNumber(systolicText);
  const diastolic = parseNumber(diastolicText);
  const drafts: DraftMetric[] = [];

  if (heartRate !== null) {
    if (!inRange(heartRate, 20, 300)) return { error: 'Heart rate must be 20-300 bpm.', drafts };
    drafts.push({ metric_type: 'heart_rate', value: heartRate, unit: 'bpm' });
  }

  const hasSystolic = systolicText.trim().length > 0;
  const hasDiastolic = diastolicText.trim().length > 0;
  if (hasSystolic || hasDiastolic) {
    if (systolic === null || diastolic === null) {
      return { error: 'Enter both systolic and diastolic pressure.', drafts: [] };
    }
    if (!inRange(systolic, 50, 300)) return { error: 'Systolic must be 50-300 mmHg.', drafts: [] };
    if (!inRange(diastolic, 30, 200)) return { error: 'Diastolic must be 30-200 mmHg.', drafts: [] };
    drafts.push(
      { metric_type: 'blood_pressure_systolic', value: systolic, unit: 'mmHg' },
      { metric_type: 'blood_pressure_diastolic', value: diastolic, unit: 'mmHg' },
    );
  }

  if (drafts.length === 0) return { error: 'Enter heart rate or blood pressure.', drafts };
  return { error: null, drafts };
}

export function VitalsManualEntryCard() {
  const t = useTheme();
  const [heartRate, setHeartRate] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    const result = buildDrafts(heartRate, systolic, diastolic);
    if (result.error) {
      setSuccess(null);
      setError(result.error);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    const recordedAt = new Date().toISOString();
    try {
      await Promise.all(result.drafts.map((draft) => (
        healthMetricService.create({ ...draft, recorded_at: recordedAt })
      )));
      invalidateApiQuery(queryKeys.dashboard);
      invalidateApiQuery('reports');
      invalidateApiQuery('risk');
      setHeartRate('');
      setSystolic('');
      setDiastolic('');
      setSuccess(`Saved ${result.drafts.length} reading${result.drafts.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save readings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[typography.bodyMed, { color: t.ink }]}>Manual vitals</Text>
      </View>
      <Input
        label="Heart rate"
        value={heartRate}
        onChangeText={setHeartRate}
        keyboardType="numeric"
        placeholder="72"
        trailingText="bpm"
        disabled={saving}
      />
      <View style={styles.bpRow}>
        <Input
          label="Systolic"
          value={systolic}
          onChangeText={setSystolic}
          keyboardType="numeric"
          placeholder="120"
          trailingText="mmHg"
          disabled={saving}
          style={styles.bpInput}
        />
        <Input
          label="Diastolic"
          value={diastolic}
          onChangeText={setDiastolic}
          keyboardType="numeric"
          placeholder="80"
          trailingText="mmHg"
          disabled={saving}
          style={styles.bpInput}
        />
      </View>
      {error && <ApiState title="Vitals save unavailable" message={error} />}
      {success && <Text style={[typography.caption, { color: t.success }]}>{success}</Text>}
      <Button label={saving ? 'Saving…' : 'Save readings'} onPress={handleSave} disabled={saving} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginBottom: 12 },
  header: { gap: 2 },
  bpRow: { flexDirection: 'row', gap: 10 },
  bpInput: { flex: 1 },
});
