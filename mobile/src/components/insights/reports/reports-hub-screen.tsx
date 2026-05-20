import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { TopBar } from '../../layout/top-bar';
import { SectionHeader } from '../../layout/section-header';
import { Card } from '../../primitives/card';
import { Button } from '../../primitives/button';
import { IconButton } from '../../primitives/icon-button';
import { InsightsSegmentedTabs } from '../insights-segmented-tabs';
import { ProgressRing } from '../../charts/progress-ring';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { reportService } from '../../../api/services';
import {
  IconSearch, IconFilter, IconRefresh, IconSparkle,
  IconPlus, IconHeartPulse, IconShield, IconActivity, ChevronRight,
  IconAlert, IconPaperclip,
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

// ─── Report Generating State ───────────────────────────────────────────────────

const GENERATE_STEPS = [
  { label: 'Collecting vitals', sub: 'Heart rate, BP, SpO₂' },
  { label: 'Analyzing trends', sub: 'Last 7 days vs baseline' },
  { label: 'Building insights', sub: 'Powered by health AI' },
  { label: 'Finalizing report', sub: 'Formatting recommendations' },
];

function ReportGeneratingState({ onCancel }: { onCancel?: () => void }) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const activeStep = 1; // second step is in-progress

  return (
    <View style={genStyles.wrap}>
      {/* Progress ring with sparkle icon */}
      <ProgressRing value={0.35} size={148} stroke={10} color={t.brand} track={t.brandSoft} glow>
        <View style={[genStyles.ringIcon, { backgroundColor: t.brandSoft, borderRadius: 999 }]}>
          <IconSparkle size={36} color={t.brand} />
        </View>
      </ProgressRing>

      <Text style={[typography.display, { color: t.ink, marginTop: 20, textAlign: 'center' }]}>
        {i18n('insights.buildingReport')}
      </Text>
      <Text style={[typography.body, { color: t.ink3, textAlign: 'center', marginTop: 4, marginBottom: 20 }]}>
        {i18n('insights.buildingReportSub')}
      </Text>

      {/* Step checklist */}
      <Card style={[genStyles.checkCard, { borderColor: t.border }]} tight>
        {GENERATE_STEPS.map((step, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <View
              key={i}
              style={[
                genStyles.checkRow,
                { borderBottomColor: t.border, borderBottomWidth: i < GENERATE_STEPS.length - 1 ? StyleSheet.hairlineWidth : 0 },
              ]}
            >
              <View style={[genStyles.checkIcon, { backgroundColor: done ? t.success + '18' : active ? t.brand + '18' : t.border + '60', borderRadius: 999 }]}>
                {done
                  ? <Text style={{ fontSize: 10 }}>✓</Text>
                  : active
                    ? <View style={[genStyles.spinner, { borderColor: t.brand }]} />
                    : <View style={[genStyles.dot, { backgroundColor: t.ink4 }]} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>{step.label}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 1 }]}>{step.sub}</Text>
              </View>
              {active && (
                <Text style={[typography.micro, { color: t.brand, textTransform: 'uppercase', letterSpacing: 0.8 }]}>WORKING</Text>
              )}
            </View>
          );
        })}
      </Card>

      <Button
        label={i18n('common.cancel')}
        variant="ghost"
        size="lg"
        style={{ marginTop: 20, minWidth: 160 }}
        onPress={onCancel ?? (() => {})}
      />
    </View>
  );
}

// ─── Reports Empty State ───────────────────────────────────────────────────────

function ReportsEmptyState({ onLearn, onLog }: { onLearn?: () => void; onLog?: () => void }) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loggedDays = 3;
  const requiredDays = 5;

  return (
    <View style={emptyStyles.wrap}>
      {/* Icon tile */}
      <View style={[emptyStyles.iconTile, { backgroundColor: t.brandSoft, borderColor: t.brand + '20', borderRadius: t.radius.xl }]}>
        <IconSparkle size={38} color={t.brand} />
      </View>

      <Text style={[typography.h3, { color: t.ink, textAlign: 'center', marginTop: 16 }]}>
        {i18n('insights.noReportsYet')}
      </Text>
      <Text style={[typography.body, { color: t.ink3, textAlign: 'center', marginTop: 6, lineHeight: 20 }]}>
        Log health data for at least{' '}
        <Text style={{ color: t.ink, fontWeight: '700' }}>{requiredDays} days</Text>
        {' '}to generate your first report.
      </Text>

      {/* 5-day progress dots */}
      <View style={emptyStyles.dotsRow}>
        {Array.from({ length: requiredDays }).map((_, i) => (
          <View
            key={i}
            style={[emptyStyles.dayDot, { backgroundColor: i < loggedDays ? t.brand : t.border }]}
          />
        ))}
      </View>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 6 }]}>
        {loggedDays} of {requiredDays} days logged
      </Text>

      {/* Dual CTAs */}
      <View style={emptyStyles.ctaRow}>
        <Button label={i18n('insights.learnHow')} variant="ghost" size="lg" style={emptyStyles.cta} onPress={onLearn ?? (() => {})} />
        <Button label={i18n('insights.logToday')} variant="solid" size="lg" style={emptyStyles.cta} onPress={onLog ?? (() => {})} />
      </View>

      {/* Info note */}
      <View style={[emptyStyles.note, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
        <Text style={[typography.caption, { color: t.ink3, textAlign: 'center' }]}>
          Reports are auto-generated once your data meets the threshold.{' '}
          <Text style={{ color: t.brand }}>No action needed.</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── Reports Error State ───────────────────────────────────────────────────────

const DATA_SOURCES = [
  { icon: <IconHeartPulse size={16} color="#059669" />, name: 'Vitals API',     status: 'ok'    },
  { icon: <IconActivity   size={16} color="#E54D4D" />, name: 'Activity sync',  status: 'error', note: 'Last sync failed — check device permissions' },
  { icon: <IconShield     size={16} color="#D97706" />, name: 'Risk prediction', status: 'ok'   },
];

function ReportsErrorState({ onRetry, onReconnect }: { onRetry?: () => void; onReconnect?: () => void }) {
  const t = useTheme();
  return (
    <View style={errStyles.wrap}>
      {/* Warning icon tile */}
      <View style={[errStyles.iconTile, { backgroundColor: t.danger + '10', borderColor: t.danger + '25', borderRadius: t.radius.xl }]}>
        <IconAlert size={36} color={t.danger} />
      </View>

      <Text style={[typography.h3, { color: t.ink, textAlign: 'center', marginTop: 16 }]}>
        Some data sources failed
      </Text>
      <Text style={[typography.caption, { color: t.ink3, textAlign: 'center', marginTop: 6 }]}>
        Fix errors below to generate a complete report
      </Text>

      {/* Source list */}
      <Card tight style={{ marginTop: 20, width: '100%' }}>
        {DATA_SOURCES.map((src, i) => (
          <View
            key={i}
            style={[
              errStyles.srcRow,
              { borderBottomColor: t.border, borderBottomWidth: i < DATA_SOURCES.length - 1 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <View style={[errStyles.srcIcon, { backgroundColor: src.status === 'error' ? t.danger + '14' : t.success + '14', borderRadius: t.radius.sm }]}>
              {src.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{src.name}</Text>
              {src.note && (
                <Text style={[typography.caption, { color: t.danger, marginTop: 2 }]}>{src.note}</Text>
              )}
            </View>
            <View style={[errStyles.statusChip, { backgroundColor: src.status === 'error' ? t.danger + '18' : t.success + '18', borderRadius: t.radius.pill }]}>
              <Text style={[typography.chip, { color: src.status === 'error' ? t.danger : t.success }]}>
                {src.status === 'error' ? 'ERROR' : 'OK'}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={errStyles.btnRow}>
        <Button label="Reconnect" variant="ghost" size="lg" style={errStyles.btn} onPress={onReconnect ?? (() => {})} />
        <Button label="Try again" variant="solid" size="lg" style={errStyles.btn} onPress={onRetry ?? (() => {})} />
      </View>

      <Text style={[typography.caption, { color: t.ink3, textAlign: 'center', marginTop: 12 }]}>
        Build with available sources
      </Text>
    </View>
  );
}

// ─── Report Row ────────────────────────────────────────────────────────────────

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

// ─── Main Screen ───────────────────────────────────────────────────────────────

export function ReportsHubScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
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
        kind: period === '7d' ? i18n('insights.weeklySummary') : i18n('insights.monthlySummary'),
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
        kind: i18n('insights.riskReport'),
        title: 'Open risk insights for full prevention plan',
        subtitle: 'Derived from health-risk endpoint',
        tone: 'warning' as Tone,
      },
    ];
  }, [report7d.data, report30d.data]);

  const loading = report7d.isLoading || report30d.isLoading;
  const error = report7d.error ?? report30d.error;

  const isEmpty = !loading && !error && hero.sections === 0;

  return (
    <Screen>
      <TopBar
        title={i18n('insights.title')}
        subtitle={i18n('insights.subtitle')}
        right={
          <View style={styles.topActions}>
            <IconButton icon={<IconSearch size={20} color={t.ink3} />} variant="subtle" accessibilityLabel={i18n('common.search')} />
            <IconButton icon={<IconFilter size={20} color={t.ink3} />} variant="subtle" accessibilityLabel={i18n('common.filter')} />
          </View>
        }
      />

      <InsightsSegmentedTabs active="reports" />

      {/* Loading → custom generating state */}
      {loading && (
        <ReportGeneratingState
          onCancel={() => {
            report7d.reload();
            report30d.reload();
          }}
        />
      )}

      {/* Error state */}
      {error && (
        <ReportsErrorState
          onRetry={() => { report7d.reload(); report30d.reload(); }}
          onReconnect={() => {}}
        />
      )}

      {/* Empty state (loaded but no sections) */}
      {isEmpty && (
        <ReportsEmptyState
          onLog={() => router.push('/home' as never)}
        />
      )}

      {!loading && !error && !isEmpty && (
        <>
          {/* Hero card — gradient with decorative circles */}
          <LinearGradient
            colors={[t.brand, `${t.brand}CC`, '#1A5FA8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderRadius: t.radius.xl, overflow: 'hidden' }]}
          >
            {/* Decorative circles */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', right: -28, top: -24, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' }}
            />
            <View
              pointerEvents="none"
              style={{ position: 'absolute', right: -10, bottom: -42, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }}
            />

            <View style={styles.heroTag}>
              <IconSparkle size={12} color="rgba(255,255,255,0.9)" />
              <Text style={[typography.micro, { color: 'rgba(255,255,255,0.9)', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
                WEEKLY SUMMARY · NEW
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
                <Text style={[typography.button, { color: t.brand }]}>{i18n('insights.readReport')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/insights/reports/export' as never)}
                style={[styles.heroBtnGhost, { borderRadius: t.radius.pill, borderColor: 'rgba(255,255,255,0.5)', flexDirection: 'row', alignItems: 'center' }]}
              >
                <IconPaperclip size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[typography.button, { color: '#fff' }]}>{i18n('insights.share')}</Text>
              </Pressable>
            </View>
          </LinearGradient>

          {/* Status card — monthly report queued */}
          <Pressable
            style={[styles.statusCard, { backgroundColor: t.card, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: t.radius.lg }]}
          >
            <View style={styles.statusRow}>
              <View style={[styles.statusIconWrap, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
                <IconRefresh size={18} color={t.brand} />
              </View>
              <View style={styles.statusText}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>{i18n('insights.monthlyQueued')}</Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
                  Will run {hero.subtitle ? 'soon' : 'on Apr 30'} · uses 30-day data
                </Text>
              </View>
              <ChevronRight size={18} color={t.ink3} />
            </View>
          </Pressable>

          <View style={styles.quickGrid}>
            <QuickTile
              icon={<IconPlus size={18} color={t.brand} />}
              label={i18n('insights.generateReport')}
              sub="On-demand"
              onPress={() => report30d.reload()}
            />
            <QuickTile
              icon={<IconHeartPulse size={18} color={t.brand} />}
              label={i18n('insights.exportPdf')}
              sub="For consultation"
              onPress={() => router.push('/insights/reports/export' as never)}
            />
          </View>

          <SectionHeader title={i18n('insights.library')} action={i18n('common.seeAll')} onActionPress={() => router.push('/insights/reports/export' as never)} />
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
  heroBtnGhost:   { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  statusCard:     { marginBottom: 12, padding: 14 },
  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  statusText:     { flex: 1 },
  quickGrid:      { flexDirection: 'row', gap: 12, marginBottom: 4 },
  quickTile:      { flex: 1, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  quickTileIcon:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  reportRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  reportIcon:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  reportBody:     { flex: 1 },
});

const genStyles = StyleSheet.create({
  wrap:      { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20 },
  ringIcon:  { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  checkCard: { width: '100%', marginTop: 8 },
  checkRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  checkIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  spinner:   { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderTopColor: 'transparent' },
  dot:       { width: 6, height: 6, borderRadius: 3 },
});

const emptyStyles = StyleSheet.create({
  wrap:     { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, paddingBottom: 16 },
  iconTile: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  dotsRow:  { flexDirection: 'row', gap: 8, marginTop: 20 },
  dayDot:   { width: 10, height: 10, borderRadius: 5 },
  ctaRow:   { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  cta:      { flex: 1 },
  note:     { padding: 14, marginTop: 20, width: '100%' },
});

const errStyles = StyleSheet.create({
  wrap:       { alignItems: 'center', paddingTop: 24, paddingHorizontal: 20, paddingBottom: 16 },
  iconTile:   { width: 86, height: 86, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  srcRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  srcIcon:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3 },
  btnRow:     { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  btn:        { flex: 1 },
});
