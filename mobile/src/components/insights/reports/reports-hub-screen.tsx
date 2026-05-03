import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { TopBar } from '../../layout/TopBar';
import { SectionHeader } from '../../layout/SectionHeader';
import { Card } from '../../primitives/Card';
import { IconButton } from '../../primitives/IconButton';
import { ApiState } from '../../api/ApiState';
import { InsightsSegmentedTabs } from '../insights-segmented-tabs';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { reportService } from '../../../api/services';
import {
  IconSearch, IconFilter, IconRefresh, IconSparkle,
  IconPlus, IconHeartPulse, IconShield, IconActivity, ChevronRight,
} from '../../../icons';

type Tone = 'success' | 'warning' | 'info' | 'danger';

function toneColor(tone: Tone, brand: ReturnType<typeof useTheme>) {
  if (tone === 'success') return brand.success;
  if (tone === 'warning') return brand.warning;
  if (tone === 'danger') return brand.danger;
  return brand.brand;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function ReportRow({
  icon,
  kind,
  title,
  subtitle,
  tone,
  onPress,
}: {
  icon: React.ReactNode;
  kind: string;
  title: string;
  subtitle: string;
  tone: Tone;
  onPress: () => void;
}) {
  const t = useTheme();
  const color = toneColor(tone, t);
  return (
    <Pressable onPress={onPress} style={[styles.reportRow, { borderBottomColor: t.border }]}>
      <View style={[styles.reportIcon, { backgroundColor: color + '18', borderRadius: t.radius.md }]}>
        {icon}
      </View>
      <View style={styles.reportBody}>
        <Text style={[typography.micro, { color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }]}>
          {kind}
        </Text>
        <Text style={[typography.bodyMed, { color: t.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={t.ink3} />
    </Pressable>
  );
}

function QuickTile({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.quickTile, { backgroundColor: t.card, borderColor: t.border, borderRadius: t.radius.lg }]}
    >
      <View style={[styles.quickTileIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
        {icon}
      </View>
      <Text style={[typography.bodyMed, { color: t.ink, marginTop: 8 }]}>{label}</Text>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{sub}</Text>
    </Pressable>
  );
}

export function ReportsHubScreen() {
  const t = useTheme();
  const loadWeekly = useCallback(() => reportService.get('7d'), []);
  const loadMonthly = useCallback(() => reportService.get('30d'), []);
  const report7d = useApiQuery(queryKeys.reports('7d'), loadWeekly);
  const report30d = useApiQuery(queryKeys.reports('30d'), loadMonthly);

  const hero = useMemo(() => {
    const data = asRecord(report7d.data);
    const sections = asArray(data.sections);
    const firstSection = asRecord(sections[0]);
    return {
      title: str(firstSection.summary, 'Weekly report ready'),
      subtitle: str(data.generated_at, ''),
      status: str(data.status, 'normal'),
      sections: sections.length,
    };
  }, [report7d.data]);

  const rows = useMemo(() => {
    const mapOne = (period: '7d' | '30d', icon: React.ReactNode, tone: Tone) => {
      const source = period === '7d' ? report7d.data : report30d.data;
      const data = asRecord(source);
      const generated = str(data.generated_at, 'No timestamp');
      const sections = asArray(data.sections).length;
      return {
        icon,
        kind: period === '7d' ? 'Weekly summary' : 'Monthly summary',
        title: str(asRecord(asArray(data.sections)[0]).summary, sections > 0 ? `${sections} sections available` : 'No report sections yet'),
        subtitle: generated,
        tone,
      };
    };
    return [
      mapOne('7d', <IconHeartPulse size={18} color="#059669" />, 'success'),
      mapOne('30d', <IconActivity size={18} color="#3B82F6" />, 'info'),
      {
        icon: <IconShield size={18} color="#D97706" />,
        kind: 'Risk report',
        title: 'Open risk insights for full prevention plan',
        subtitle: 'Derived from health-risk endpoint',
        tone: 'warning' as Tone,
      },
    ];
  }, [report7d.data, report30d.data]);

  const loading = report7d.isLoading || report30d.isLoading;
  const error = report7d.error ?? report30d.error;

  return (
    <Screen>
      <TopBar
        title="Insights"
        subtitle="Reports · Risks · Goals"
        right={
          <View style={styles.topActions}>
            <IconButton icon={<IconSearch size={20} color={t.ink3} />} accessibilityLabel="Search" />
            <IconButton icon={<IconFilter size={20} color={t.ink3} />} accessibilityLabel="Filter" />
          </View>
        }
      />

      <InsightsSegmentedTabs active="reports" />

      {loading && <ApiState title="Loading reports" loading />}
      {error && (
        <ApiState
          title="Reports unavailable"
          message={error.message}
          actionLabel="Retry"
          onAction={() => {
            report7d.reload();
            report30d.reload();
          }}
        />
      )}

      {!loading && !error && (
        <>
          <View style={[styles.heroCard, { backgroundColor: t.brand, borderRadius: t.radius.xl }]}>
            <View style={styles.heroTag}>
              <IconSparkle size={12} color="rgba(255,255,255,0.9)" />
              <Text style={[typography.micro, { color: 'rgba(255,255,255,0.9)', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
                Weekly summary
              </Text>
            </View>
            <Text style={[typography.title, { color: '#fff', marginTop: 10, marginBottom: 6 }]}>
              {hero.title}
            </Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.65)', marginBottom: 16 }]}>
              {hero.subtitle || 'No generated time available'}
            </Text>
            <View style={styles.heroButtons}>
              <Pressable
                onPress={() => router.push('/insights/reports/7d' as never)}
                style={[styles.heroBtnPrimary, { borderRadius: t.radius.pill }]}
              >
                <Text style={[typography.button, { color: t.brand }]}>Read report</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/insights/reports/export' as never)}
                style={[styles.heroBtnGhost, { borderRadius: t.radius.pill, borderColor: 'rgba(255,255,255,0.5)' }]}
              >
                <Text style={[typography.button, { color: '#fff' }]}>Export PDF</Text>
              </Pressable>
            </View>
          </View>

          <Card style={{ ...styles.statusCard, backgroundColor: t.brandSoft }}>
            <View style={styles.statusRow}>
              <View style={[styles.statusIconWrap, { backgroundColor: t.brand + '20', borderRadius: t.radius.sm }]}>
                <IconRefresh size={16} color={t.brand} />
              </View>
              <View style={styles.statusText}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>Report sections: {hero.sections}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                  Status: {hero.status}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.quickGrid}>
            <QuickTile
              icon={<IconPlus size={18} color={t.brand} />}
              label="Generate report"
              sub="On-demand"
              onPress={() => report30d.reload()}
            />
            <QuickTile
              icon={<IconHeartPulse size={18} color={t.brand} />}
              label="Export PDF"
              sub="For consultation"
              onPress={() => router.push('/insights/reports/export' as never)}
            />
          </View>

          <SectionHeader title="Library" action="See all" onActionPress={() => router.push('/insights/reports/export' as never)} />
          <Card tight>
            {rows.map((row, i) => (
              <ReportRow
                key={i}
                icon={row.icon}
                kind={row.kind}
                title={row.title}
                subtitle={row.subtitle}
                tone={row.tone}
                onPress={() => router.push('/insights/reports/7d' as never)}
              />
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions:     { flexDirection: 'row', gap: 4 },
  heroCard:       { padding: 20, marginTop: 12, marginBottom: 12 },
  heroTag:        { flexDirection: 'row', alignItems: 'center' },
  heroButtons:    { flexDirection: 'row', gap: 10 },
  heroBtnPrimary: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  heroBtnGhost:   { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  statusCard:     { marginBottom: 12, borderWidth: 0 },
  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  statusText:     { flex: 1 },
  quickGrid:      { flexDirection: 'row', gap: 12, marginBottom: 4 },
  quickTile:      { flex: 1, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  quickTileIcon:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reportRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  reportIcon:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  reportBody:     { flex: 1 },
});
