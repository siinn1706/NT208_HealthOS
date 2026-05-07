import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { ApiState } from '../api/ApiState';
import { ChartSkeleton } from '../api/Skeletons';
import { VitalsLineChart, RangeKey } from '../charts/VitalsLineChart';
import { SegmentedControl } from '../primitives/input/SegmentedControl';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/Chip';
import { dashboardService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import type { VitalPoint } from '../../../../shared/api-contracts';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '1D', label: '1D', days: 1 },
  { key: '7D', label: '7D', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
];

function toChartPoints(data: VitalPoint[]) {
  return data
    .map((point, i) => ({ x: i, y: point.heart_rate ?? 0 }))
    .filter((p) => p.y > 0);
}

export function VitalsDetailScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<RangeKey>('7D');
  const selectedDays = RANGES.find((r) => r.key === range)?.days ?? 7;

  const loadVitals = useCallback(() => dashboardService.vitals(selectedDays), [selectedDays]);
  const vitals = useApiQuery<VitalPoint[]>(`${queryKeys.dashboard}.vitals.${range}`, loadVitals);
  const points = vitals.data ? toChartPoints(vitals.data) : [];
  const values = points.map((p) => p.y);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const delta = values.length >= 2 ? values[values.length - 1] - values[0] : 0;

  const chartW = width - 32;
  const RANGE_LABELS = RANGES.map((r) => r.label);

  return (
    <Screen>
      <TopBar
        title="Vitals"
        left={<Text style={[typography.body, { color: t.brand }]} onPress={() => router.back()}>Back</Text>}
      />

      {/* Hero value */}
      <View style={styles.heroRow}>
        <Text style={[styles.bigValue, { color: t.ink }]}>{avg}</Text>
        <Text style={[typography.h3, { color: t.ink3, alignSelf: 'flex-end', marginBottom: 6, marginLeft: 4 }]}>bpm</Text>
        {delta !== 0 && (
          <View style={{ marginLeft: 10, alignSelf: 'center' }}>
            <Chip
              label={`${delta > 0 ? '+' : ''}${Math.round(delta)} bpm`}
              variant={delta >= 0 ? 'success' : 'danger'}
            />
          </View>
        )}
      </View>

      {/* Range selector — animated segmented control */}
      <View style={styles.rangeRow}>
        <SegmentedControl
          options={RANGE_LABELS}
          value={range}
          onChange={(opt) => {
            const found = RANGES.find((r) => r.label === opt);
            if (found) setRange(found.key);
          }}
        />
      </View>

      {/* Chart */}
      {vitals.isLoading && <ApiState title="Loading vitals" loading skeleton={<ChartSkeleton />} />}
      {vitals.error && <ApiState title="Vitals unavailable" message={vitals.error.message} actionLabel="Retry" onAction={vitals.reload} />}
      {!vitals.isLoading && !vitals.error && (
        <View style={[styles.chartCard, { backgroundColor: t.card, borderRadius: t.radius.lg, ...t.shadows.card }]}>
          <VitalsLineChart
            points={points}
            width={chartW - 24}
            height={140}
            targetMin={60}
            targetMax={100}
          />
        </View>
      )}

      {/* Stats row */}
      {!vitals.isLoading && avg > 0 && (
        <View style={[styles.statsRow, { backgroundColor: t.bgElev, borderRadius: t.radius.md }]}>
          {[{ label: 'Avg', value: avg }, { label: 'Min', value: min }, { label: 'Max', value: max }].map((stat, idx, arr) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statCell}>
                <Text style={[typography.caption, { color: t.ink4 }]}>{stat.label}</Text>
                <Text style={[typography.h3, { color: t.ink }]}>{stat.value}</Text>
              </View>
              {idx < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: t.border }]} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Recent readings */}
      {!vitals.isLoading && vitals.data && vitals.data.length > 0 && (
        <>
          <Text style={[typography.h3, styles.sectionTitle, { color: t.ink }]}>Recent readings</Text>
          {vitals.data.slice(-5).reverse().map((point, i) => (
            <View key={i} style={[styles.readingRow, { borderBottomColor: t.border }]}>
              <Text style={[typography.caption, { color: t.ink4 }]}>
                {new Date(point.date).toLocaleDateString()}
              </Text>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{point.heart_rate ?? '—'} bpm</Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow:     { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 8 },
  bigValue:    { fontSize: 44, lineHeight: 48, fontFamily: 'Inter_800ExtraBold' },
  rangeRow:    { marginBottom: 12 },
  chartCard:   { padding: 12, marginBottom: 12 },
  statsRow:    { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12 },
  statCell:    { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  sectionTitle:{ marginTop: 4, marginBottom: 8 },
  readingRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
