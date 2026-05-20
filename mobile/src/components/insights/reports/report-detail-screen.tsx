import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { SectionHeader } from '../../layout/section-header';
import { Card } from '../../primitives/card';
import { Sparkline } from '../../charts/sparkline';
import { ApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { reportService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography, tabularNums } from '../../../theme/typography';
import { ChevronLeft, IconMore, IconPaperclip, IconCheck, IconSparkle } from '../../../icons';

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
  if (period === '30d') return 'Monthly report';
  if (period === '90d') return 'Quarterly report';
  return 'Weekly report';
}

export function ReportDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
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
        <ApiState title="Report not found" message="Supported report ids: 7d, 30d, 90d." actionLabel={i18n('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  if (report.isLoading) {
    return (
      <Screen>
        <ApiState title={i18n('api.loading')} loading />
      </Screen>
    );
  }

  if (report.error) {
    return (
      <Screen>
        <ApiState title={i18n('api.unavailable')} message={report.error.message} actionLabel={i18n('common.retry')} onAction={report.reload} />
      </Screen>
    );
  }

  if (!model.sectionsCount) {
    return (
      <Screen>
        <ApiState title="No report data" message="No report sections returned for this period." actionLabel={i18n('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  // Stat card data derived from vitalsRows
  const sleepRow = model.vitalsRows.find((r) => r.label === 'Sleep');
  const hrRow = model.vitalsRows.find((r) => r.label === 'Heart rate');

  return (
    <Screen>
      <BackBar
        title={periodLabel(period)}
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

      {/* Hero card — pale-blue with icon square */}
      <View style={[styles.heroCard, { backgroundColor: t.brandSoft, borderRadius: t.radius.xl, borderWidth: 1, borderColor: t.brand + '20' }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIconSq, { backgroundColor: t.brand, borderRadius: t.radius.sm }]}>
            <IconSparkle size={16} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
              WEEKLY SUMMARY
            </Text>
            <Text style={[typography.caption, { color: t.ink3 }]}>
              {model.generatedAt ? new Date(model.generatedAt).toLocaleDateString() : 'No date'}
            </Text>
          </View>
        </View>
        <Text style={[typography.bodyMed, { color: t.ink, marginTop: 12, lineHeight: 22 }]}>
          {model.heroTitle}
        </Text>
      </View>

      {/* 3-stat card grid */}
      <View style={styles.statGrid}>
        {[
          { label: 'SLEEP',      value: sleepRow?.value ?? '—',         delta: '▲ 22m',    deltaGood: true  },
          { label: 'RESTING HR', value: hrRow?.value ?? '—',            delta: '▼ 4 bpm',  deltaGood: true  },
          { label: 'ADHERENCE',  value: `${model.medAdherence}%`,        delta: '14 / 14',  deltaGood: true  },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6 }]}>{stat.label}</Text>
            <Text style={[typography.title, tabularNums, { color: t.ink, marginTop: 4 }]}>{stat.value}</Text>
            <Text style={[typography.caption, { color: stat.deltaGood ? t.success : t.warning, marginTop: 2 }]}>{stat.delta}</Text>
          </View>
        ))}
      </View>

      {/* Key findings — tone cards */}
      <SectionHeader title={i18n('insights.keyFindings')} />
      {model.bullets.map((bullet, i) => {
        const toneType = i === 0 ? 'success' : i === 2 ? 'warning' : 'info';
        const toneColor = toneType === 'success' ? t.success : toneType === 'warning' ? t.warning : t.brand;
        return (
          <View
            key={i}
            style={[
              styles.findingCard,
              {
                backgroundColor: toneColor + '12',
                borderColor: toneColor + '30',
                borderRadius: t.radius.lg,
                borderWidth: 1,
                marginBottom: 8,
                padding: 12,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: toneColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={18} color={toneColor} />
              </View>
              <Text style={[typography.body, { color: t.ink, flex: 1, lineHeight: 20 }]}>{bullet}</Text>
            </View>
          </View>
        );
      })}

      {/* Vitals section */}
      <SectionHeader title={i18n('insights.vitals')} />
      <Card tight>
        {model.vitalsRows.map((row) => (
          <VitalRow key={row.label} {...row} />
        ))}
      </Card>

      {/* Medications adherence */}
      <SectionHeader title={i18n('insights.medications')} />
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
  heroTopRow:    { flexDirection: 'row', alignItems: 'center' },
  heroIconSq:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  statGrid:      { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4 },
  statCard:      { flex: 1, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  findingCard:   {},
  vitalRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  vitalText:     { flex: 1 },
  medRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medIcon:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  medText:       { flex: 1 },
});
