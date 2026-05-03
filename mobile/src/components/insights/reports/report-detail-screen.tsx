import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { SectionHeader } from '../../layout/SectionHeader';
import { Card } from '../../primitives/Card';
import { Sparkline } from '../../charts/Sparkline';
import { ApiState } from '../../api/ApiState';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { reportService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft, IconMore, IconPaperclip, IconCheck } from '../../../icons';

function BackBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={24} color={t.ink} />
      </Pressable>
      {title ? (
        <Text style={[typography.h3, { flex: 1, color: t.ink }]} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right && <View style={styles.backRight}>{right}</View>}
    </View>
  );
}

function VitalRow({ label, value, sub, data, color }: { label: string; value: string; sub: string; data: number[]; color: string }) {
  const t = useTheme();
  return (
    <View style={[styles.vitalRow, { borderBottomColor: t.border }]}>
      <View style={styles.vitalText}>
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 2 }]}>{label}</Text>
        <Text style={[typography.bodyMed, { color: t.ink }]}>{value}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{sub}</Text>
      </View>
      <Sparkline data={data.length ? data : [0]} color={color} width={80} height={32} />
    </View>
  );
}

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

function latestNonZero(values: number[]) {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] > 0) return values[i];
  }
  return 0;
}

function periodLabel(period: '7d' | '30d' | '90d') {
  if (period === '30d') return 'Monthly summary';
  if (period === '90d') return 'Quarterly summary';
  return 'Weekly summary';
}

export function ReportDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const period = rawId === '7d' || rawId === '30d' || rawId === '90d' ? rawId : null;

  const loadReport = useCallback(async () => {
    return reportService.get(period ?? '7d');
  }, [period]);
  const report = useApiQuery(queryKeys.reports(period ?? 'invalid'), loadReport, { enabled: Boolean(period) });

  const model = useMemo(() => {
    const data = asRecord(report.data);
    const sections = asArray(data.sections).map(asRecord);
    const sectionBy = (key: string) => sections.find((item) => asString(item.category) === key) ?? {};
    const vitals = asRecord(sectionBy('vitals'));
    const sleep = asRecord(sectionBy('sleep'));
    const medication = asRecord(sectionBy('medication'));

    const vitalsData = asArray(vitals.data).map(asRecord);
    const sleepData = asArray(sleep.data).map(asRecord);
    const medData = asArray(medication.data).map(asRecord);
    const statuses = sections.map((item) => asString(item.status, 'normal'));

    const heartSeries = vitalsData.map((point) => asNumber(point.value));
    const sysSeries = vitalsData.map((point) => asNumber(point.value2));
    const diaSeries = vitalsData.map((point) => asNumber(point.value3));
    const sleepSeries = sleepData.map((point) => asNumber(point.value));
    const medSeries = medData.map((point) => asNumber(point.value));

    const alerts = asArray(data.alerts).map(asRecord);
    const bullets = alerts
      .map((item) => asString(item.message))
      .filter(Boolean)
      .slice(0, 4);

    const normalCount = statuses.filter((status) => status === 'normal').length;
    const score = sections.length ? Math.round((normalCount / sections.length) * 100) : 0;
    const status = asString(data.status, 'normal');

    return {
      generatedAt: asString(data.generated_at),
      status,
      heroTitle: bullets[0] ?? 'Report generated from current health signals.',
      sectionsCount: sections.length,
      score,
      vitalsRows: [
        {
          label: 'Blood pressure',
          value: `${Math.round(latestNonZero(sysSeries))} / ${Math.round(latestNonZero(diaSeries))} mmHg`,
          sub: `Trend ${asString(asRecord(vitals.stats).trend, 'stable')}`,
          data: sysSeries,
          color: '#3B82F6',
        },
        {
          label: 'Heart rate',
          value: `${Math.round(latestNonZero(heartSeries))} bpm`,
          sub: `Change ${asNumber(asRecord(vitals.stats).change_percent)}%`,
          data: heartSeries,
          color: '#059669',
        },
        {
          label: 'Sleep',
          value: `${latestNonZero(sleepSeries).toFixed(1)} hrs`,
          sub: `Change ${asNumber(asRecord(sleep.stats).change_percent)}%`,
          data: sleepSeries,
          color: '#8B5CF6',
        },
      ],
      medAdherence: Math.round(latestNonZero(medSeries)),
      bullets: bullets.length ? bullets : ['No alert summary for this period.'],
    };
  }, [report.data]);

  if (!period) {
    return (
      <Screen>
        <ApiState title="Report not found" message="Supported report ids: 7d, 30d, 90d." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  if (report.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading report" loading />
      </Screen>
    );
  }

  if (report.error) {
    return (
      <Screen>
        <ApiState title="Report unavailable" message={report.error.message} actionLabel="Retry" onAction={report.reload} />
      </Screen>
    );
  }

  if (!model.sectionsCount) {
    return (
      <Screen>
        <ApiState title="No report data" message="No report sections returned for this period." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackBar
        title=""
        right={
          <View style={styles.topActions}>
            <Pressable onPress={() => router.push('/insights/reports/export' as never)} hitSlop={8} style={styles.iconBtn}>
              <IconPaperclip size={20} color={t.ink3} />
            </Pressable>
            <Pressable hitSlop={8} style={styles.iconBtn}>
              <IconMore size={20} color={t.ink3} />
            </Pressable>
          </View>
        }
      />

      <View style={[styles.heroCard, { backgroundColor: t.brand, borderRadius: t.radius.xl }]}>
        <Text style={[typography.micro, { color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 }]}>
          {periodLabel(period)} · {period}
        </Text>
        <Text style={[typography.title, { color: '#fff', marginTop: 8, marginBottom: 6 }]}>
          {model.heroTitle}
        </Text>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]}>
          {model.generatedAt ? `Generated ${new Date(model.generatedAt).toLocaleString()}` : 'Generated time unavailable'}
        </Text>
      </View>

      <SectionHeader title="Health score this period" />
      <Card tight>
        <View style={styles.scoreRow}>
          <View style={styles.scoreNums}>
            <Text style={[typography.display, { color: t.ink }]}>{model.score}</Text>
            <Text style={[typography.caption, { color: t.ink3, marginLeft: 4, alignSelf: 'flex-end', marginBottom: 4 }]}>pts</Text>
          </View>
          <View style={[styles.scoreDelta, { backgroundColor: t.success + '18', borderRadius: t.radius.pill }]}>
            <Text style={[typography.chip, { color: t.success }]}>{model.status}</Text>
          </View>
        </View>
        <Text style={[typography.caption, { color: t.ink3, marginBottom: 10 }]}>Derived from section status coverage</Text>
        <View style={[styles.progressTrack, { backgroundColor: t.border, borderRadius: t.radius.pill }]}>
          <View style={[styles.progressFill, { backgroundColor: t.brand, width: `${model.score}%`, borderRadius: t.radius.pill }]} />
        </View>
      </Card>

      <SectionHeader title="Vitals" />
      <Card tight>
        {model.vitalsRows.map((row) => (
          <VitalRow key={row.label} {...row} />
        ))}
      </Card>

      <SectionHeader title="Medications" />
      <Card tight style={{ backgroundColor: t.success + '10', borderColor: t.success + '30' }}>
        <View style={styles.medRow}>
          <View style={[styles.medIcon, { backgroundColor: t.success + '20', borderRadius: t.radius.sm }]}>
            <IconCheck size={18} color={t.success} />
          </View>
          <View style={styles.medText}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>{model.medAdherence}% adherence</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
              Derived from medication section values
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="AI summary" />
      <Card style={{ backgroundColor: t.brandSoft, borderColor: t.brand + '20' }}>
        {model.bullets.map((bullet, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: t.brand }]} />
            <Text style={[typography.body, { color: t.ink, flex: 1 }]}>{bullet}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  backBtn:       { width: 40, alignItems: 'flex-start' },
  backRight:     { flexDirection: 'row', gap: 4 },
  topActions:    { flexDirection: 'row', gap: 4 },
  iconBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroCard:      { padding: 20, marginTop: 4, marginBottom: 4 },
  scoreRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  scoreNums:     { flexDirection: 'row', alignItems: 'flex-end' },
  scoreDelta:    { paddingHorizontal: 10, paddingVertical: 4 },
  progressTrack: { height: 6, width: '100%' },
  progressFill:  { height: 6 },
  vitalRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  vitalText:     { flex: 1 },
  medRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medIcon:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  medText:       { flex: 1 },
  bulletRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bulletDot:     { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
});
