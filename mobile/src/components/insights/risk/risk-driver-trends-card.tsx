import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../primitives/card';
import { ApiState } from '../../api/api-state';
import { Sparkline } from '../../charts/sparkline';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { reportService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography, tabularNums } from '../../../theme/typography';

type TrendMetric = 'blood_pressure' | 'bmi' | 'steps' | 'heart_rate' | 'weight' | 'sleep' | 'calories';

const METRIC_LABELS: Record<TrendMetric, string> = {
  blood_pressure: 'Blood pressure',
  bmi: 'BMI',
  steps: 'Activity',
  heart_rate: 'Heart rate',
  weight: 'Weight',
  sleep: 'Sleep',
  calories: 'Calories',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function metricForFactor(label: string): TrendMetric | null {
  const lower = label.toLowerCase();
  if (lower.includes('bp') || lower.includes('pressure')) return 'blood_pressure';
  if (lower.includes('bmi')) return 'bmi';
  if (lower.includes('step') || lower.includes('activity')) return 'steps';
  if (lower.includes('heart')) return 'heart_rate';
  if (lower.includes('weight')) return 'weight';
  if (lower.includes('sleep')) return 'sleep';
  if (lower.includes('calorie') || lower.includes('nutrition') || lower.includes('diet')) return 'calories';
  return null;
}

export function riskFactorsToTrendMetrics(factors: unknown[]): TrendMetric[] {
  const metrics: TrendMetric[] = [];
  const seen = new Set<string>();
  for (const factor of factors) {
    const metric = metricForFactor(asString(asRecord(factor).label));
    if (metric && !seen.has(metric)) {
      seen.add(metric);
      metrics.push(metric);
    }
  }
  return metrics;
}

function lastNonZero(values: number[]) {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] > 0) return values[i];
  }
  return values[values.length - 1] ?? 0;
}

export function RiskDriverTrendsCard({ riskId, factors }: { riskId: string; factors: unknown[] }) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const metrics = useMemo(() => riskFactorsToTrendMetrics(factors), [factors]);
  const metricKey = metrics.join(',');
  const loadTrends = useCallback(() => reportService.trendsBatch(metrics, '30d'), [metrics]);
  const trends = useApiQuery(queryKeys.reportTrendBatch(`${riskId}.${metricKey}`, '30d'), loadTrends, {
    enabled: metrics.length > 0,
  });

  if (metrics.length === 0) {
    return <ApiState title="No trend drivers" message="This risk payload did not include drivers that map to report trend metrics." />;
  }

  if (trends.isLoading) {
    return <ApiState title={i18n('api.loading')} loading />;
  }

  if (trends.error) {
    return <ApiState title="Driver trends unavailable" message={trends.error.message} actionLabel={i18n('common.retry')} onAction={trends.reload} />;
  }

  const rows = metrics.map((metric) => {
    const trend = asRecord(asRecord(trends.data)[metric]);
    const points = asArray(trend.data_points).map((point) => asNumber(asRecord(point).value));
    return {
      metric,
      label: asString(trend.metric_label, METRIC_LABELS[metric]).replace(/_/g, ' '),
      unit: asString(trend.unit),
      trend: asString(trend.trend, 'stable'),
      change: asNumber(trend.change_percent),
      values: points,
    };
  });

  return (
    <Card tight style={styles.card}>
      <Text style={[typography.caption, { color: t.ink3 }]}>
        Existing report trends for the drivers that feed this risk score.
      </Text>
      {rows.map((row) => {
        const color = row.trend === 'improving' ? t.success : row.trend === 'declining' ? t.warning : t.brand;
        return (
          <View key={row.metric} style={[styles.row, { borderBottomColor: t.border }]}>
            <View style={styles.rowText}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{row.label}</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                {row.trend} over 30d
              </Text>
            </View>
            <Sparkline data={row.values.length ? row.values : [0, 0]} color={color} width={86} height={34} />
            <View style={styles.valueCol}>
              <Text style={[typography.bodyMed, tabularNums, { color: t.ink }]}>
                {lastNonZero(row.values).toFixed(row.unit === 'kg' ? 1 : 0)}
              </Text>
              <Text style={[typography.micro, { color }]}>
                {row.change >= 0 ? '+' : ''}{row.change}%
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1 },
  valueCol: { width: 52, alignItems: 'flex-end' },
});
