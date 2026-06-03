import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Card } from '../../primitives/card';
import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input/input';
import { ApiState } from '../../api/api-state';
import { invalidateApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthMetricService } from '../../../api/services/health-metric-service';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';

interface GoalWeightLogCardProps {
  onSaved?: () => void;
}

function parseWeight(value: string) {
  const normalized = value.trim();
  if (!normalized) return { value: null, error: 'Enter a weight reading.' };
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { value: null, error: 'Weight must be a number.' };
  if (parsed < 1 || parsed > 500) return { value: null, error: 'Weight must be 1-500 kg.' };
  return { value: parsed, error: null };
}

export function GoalWeightLogCard({ onSaved }: GoalWeightLogCardProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    const parsed = parseWeight(weight);
    if (parsed.error || parsed.value === null) {
      setSuccess(null);
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await healthMetricService.create({
        metric_type: 'weight_kg',
        value: parsed.value,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });
      invalidateApiQuery(queryKeys.healthGoalProgress('weight_kg', '7d'));
      invalidateApiQuery(queryKeys.healthGoalProgress('weight_kg', '30d'));
      invalidateApiQuery(queryKeys.dashboard);
      invalidateApiQuery('reports');
      invalidateApiQuery('risk');
      setWeight('');
      setSuccess(`Saved ${parsed.value.toFixed(1)} kg.`);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save weight.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={[typography.bodyMed, { color: t.ink }]}>Log weight progress</Text>
      <Text style={[typography.caption, { color: t.ink3 }]}>
        Saves a manual Core weight metric used by goal progress, reports, and risk screens.
      </Text>
      <Input
        label={i18n('profile.fieldWeight')}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="70.5"
        trailingText="kg"
        disabled={saving}
      />
      {error && <ApiState title="Weight save unavailable" message={error} />}
      {success && <Text style={[typography.caption, { color: t.success }]}>{success}</Text>}
      <Button label={saving ? 'Saving...' : 'Save weight'} onPress={handleSave} disabled={saving} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginTop: 12 },
});
