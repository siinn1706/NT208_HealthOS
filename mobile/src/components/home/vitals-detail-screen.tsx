import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { ApiState } from '../api/api-state';
import { ChartSkeleton } from '../api/skeletons';
import { VitalsLineChart, RangeKey } from '../charts/vitals-line-chart';
import { SegmentedControl } from '../primitives/input/segmented-control';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Chip } from '../primitives/chip';
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
  const { t: i18n } = useTranslation();
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
        title={i18n('home.vitals')}
        left={<Text style={[typography.body, { color: t.brand }]} onPress={() => router.back()}>{i18n('common.back')}</Text>}
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
      {vitals.isLoading && <ApiState title={i18n('home.loadingVitals')} loading skeleton={<ChartSkeleton />} />}
      {vitals.error && <ApiState title={i18n('home.vitalsUnavailable')} message={vitals.error.message} actionLabel={i18n('common.retry')} onAction={vitals.reload} />}
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
          {[{ label: i18n('home.avg'), value: avg }, { label: i18n('home.min'), value: min }, { label: i18n('home.max'), value: max }].map((stat, idx, arr) => (
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
          <Text style={[typography.h3, styles.sectionTitle, { color: t.ink }]}>{i18n('home.recentReadings')}</Text>
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
