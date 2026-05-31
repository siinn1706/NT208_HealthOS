import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../primitives/card';
import { ApiState } from '../../api/api-state';
import { VitalsLineChart } from '../../charts/vitals-line-chart';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import type { ApiQueryResult } from '../../../api/query';
import type { GoalProgressPoint } from '../../../api/services/health-goal-service';

interface GoalWeightProgressCardProps {
  target: number;
  progress: ApiQueryResult<GoalProgressPoint[]>;
}

export function GoalWeightProgressCard({ target, progress }: GoalWeightProgressCardProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const points = progress.data ?? [];

  if (progress.isLoading) {
    return <ApiState title="Loading weekly progress" loading />;
  }

  if (progress.error) {
    return (
      <ApiState
        title="Weekly progress unavailable"
        message={progress.error.message}
        actionLabel={i18n('common.retry')}
        onAction={() => { void progress.reload(); }}
      />
    );
  }

  if (points.length === 0) {
    return (
      <ApiState
        title="No weight trend yet"
        message="Log weight metrics from a connected device or profile update to see goal progress."
      />
    );
  }

  return (
    <Card style={styles.card}>
      <VitalsLineChart
        points={points.map((point, index) => ({ x: index, y: point.value }))}
        targetMin={target}
        targetMax={target}
        yLabels={buildWeightAxisLabels(points, target)}
        xLabels={buildDateLabels(points)}
      />
      <View style={styles.rows}>
        {points.slice(-3).map((point) => (
          <View key={point.date} style={[styles.row, { borderColor: t.border }]}>
            <Text style={[typography.caption, { color: t.ink3 }]}>{formatShortDate(point.date)}</Text>
            <Text style={[typography.bodyMed, { color: t.ink }]}>{point.value.toFixed(1)} kg</Text>
            <Text style={[typography.micro, { color: t.ink3 }]}>Target {point.target.toFixed(1)} kg</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildDateLabels(points: { date: string }[]) {
  if (!points.length) return [];
  if (points.length === 1) return [formatShortDate(points[0].date)];
  return [formatShortDate(points[0].date), formatShortDate(points[points.length - 1].date)];
}

function buildWeightAxisLabels(points: { value: number }[], target: number) {
  const values = [...points.map((point) => point.value), target].filter(Number.isFinite);
  if (!values.length) return undefined;
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.05;
  return [0.25, 0.5, 0.75].map((fraction) => `${(min + fraction * (max - min)).toFixed(1)} kg`);
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  rows: { gap: 8, marginTop: 4 },
  row: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
});
