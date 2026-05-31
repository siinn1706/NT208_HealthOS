import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../primitives/card';
import { ApiState } from '../../api/api-state';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import type { ApiQueryResult } from '../../../api/query';
import type { GoalProgressPoint } from '../../../api/services/health-goal-service';

interface GoalWeightRecordListCardProps {
  progress: ApiQueryResult<GoalProgressPoint[]>;
}

export function GoalWeightRecordListCard({ progress }: GoalWeightRecordListCardProps) {
  const t = useTheme();
  const points = (progress.data ?? []).slice(-5).reverse();

  if (progress.isLoading) {
    return <ApiState title="Loading weight records" loading />;
  }

  if (progress.error) {
    return <ApiState title="Weight records unavailable" message={progress.error.message} actionLabel="Retry" onAction={() => { void progress.reload(); }} />;
  }

  if (points.length === 0) {
    return (
      <ApiState
        title="No weight records yet"
        message="Use Log weight progress to create Core weight metrics for this goal."
      />
    );
  }

  return (
    <Card tight>
      {points.map((point, index) => {
        const atTarget = point.value <= point.target;
        const progressLabel = point.progress_percent === null ? 'LOGGED' : `${Math.round(point.progress_percent)}%`;
        return (
          <View
            key={point.date}
            style={[styles.row, { borderBottomColor: t.border, borderBottomWidth: index === points.length - 1 ? 0 : StyleSheet.hairlineWidth }]}
          >
            <View style={styles.copy}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{point.value.toFixed(1)} kg</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                {formatShortDate(point.date)} · target {point.target.toFixed(1)} kg
              </Text>
            </View>
            <Text style={[typography.micro, { color: atTarget ? t.success : t.ink3 }]}>
              {atTarget ? 'AT TARGET' : progressLabel}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  copy: { flex: 1 },
});
