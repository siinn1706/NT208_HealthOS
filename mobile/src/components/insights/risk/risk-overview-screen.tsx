import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { TopBar } from '../../layout/TopBar';
import { SectionHeader } from '../../layout/SectionHeader';
import { Card } from '../../primitives/Card';
import { Button } from '../../primitives/Button';
import { IconButton } from '../../primitives/IconButton';
import { ApiState } from '../../api/ApiState';
import { InsightsSegmentedTabs } from '../insights-segmented-tabs';
import { RiskGauge } from './risk-gauge';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { riskService } from '../../../api/services';
import {
  IconRefresh, IconMore, IconHeartPulse,
  IconMoon, IconActivity, IconAlert,
} from '../../../icons';

type ChipVariant = 'success' | 'warning' | 'danger' | 'info';

function chipColors(variant: ChipVariant, t: ReturnType<typeof useTheme>) {
  if (variant === 'success') return { bg: t.success + '18', text: t.success };
  if (variant === 'warning') return { bg: t.warning + '18', text: t.warning };
  if (variant === 'danger') return { bg: t.danger + '18', text: t.danger };
  return { bg: t.brand + '18', text: t.brand };
}

function Chip({ label, variant }: { label: string; variant: ChipVariant }) {
  const t = useTheme();
  const { bg, text } = chipColors(variant, t);
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderRadius: t.radius.pill }]}>
      <Text style={[typography.chip, { color: text }]}>{label}</Text>
    </View>
  );
}

function riskVariant(level: string): ChipVariant {
  const lower = level.toLowerCase();
  if (lower === 'critical' || lower === 'high') return 'danger';
  if (lower === 'moderate') return 'warning';
  if (lower === 'low') return 'success';
  return 'info';
}

function riskProgress(probability: unknown) {
  return Math.max(0, Math.min(1, typeof probability === 'number' ? probability : 0));
}

function iconForCondition(condition: string, color: string) {
  const lower = condition.toLowerCase();
  if (lower.includes('sleep')) return <IconMoon size={16} color={color} />;
  if (lower.includes('pressure') || lower.includes('heart')) return <IconHeartPulse size={16} color={color} />;
  if (lower.includes('weight')) return <IconActivity size={16} color={color} />;
  return <IconAlert size={16} color={color} />;
}

export function RiskOverviewScreen() {
  const t = useTheme();
  const loadRisk = useCallback(() => riskService.summary(), []);
  const risk = useApiQuery(queryKeys.riskSummary, loadRisk);

  const parsed = useMemo(() => {
    const payload = (risk.data && typeof risk.data === 'object') ? (risk.data as Record<string, unknown>) : {};
    const risks = Array.isArray(payload.risks) ? payload.risks as Record<string, unknown>[] : [];
    const sorted = risks.slice().sort((a, b) => riskProgress(b.probability) - riskProgress(a.probability));
    const top = sorted[0] ?? null;
    const others = sorted.slice(1, 4);
    const overallScore = typeof payload.overallScore === 'number' ? payload.overallScore : 100;
    return {
      generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : '',
      overallScore,
      top,
      others,
    };
  }, [risk.data]);

  return (
    <Screen>
      <TopBar
        title="Insights"
        subtitle="Personalized risk profile"
        right={
          <View style={styles.topActions}>
            <IconButton icon={<IconRefresh size={20} color={t.ink3} />} accessibilityLabel="Refresh" onPress={() => risk.reload()} />
            <IconButton icon={<IconMore size={20} color={t.ink3} />} accessibilityLabel="More" />
          </View>
        }
      />

      <InsightsSegmentedTabs active="risk" />

      {risk.isLoading && <ApiState title="Loading risk profile" loading />}
      {risk.error && <ApiState title="Risk profile unavailable" message={risk.error.message} actionLabel="Retry" onAction={risk.reload} />}

      {!risk.isLoading && !risk.error && (
        <>
          <Card style={{ ...styles.heroCard, backgroundColor: t.warning + '12', borderColor: t.warning + '30' }}>
            <View style={styles.heroContent}>
              <RiskGauge value={Math.max(0, Math.min(1, (100 - parsed.overallScore) / 100))} size={150} />
              <View style={styles.heroText}>
                <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
                  Overall risk
                </Text>
                <Text style={[typography.title, { color: t.ink, marginTop: 4 }]}>
                  {parsed.top ? String(parsed.top.level ?? 'unknown') : 'No data'}
                </Text>
                <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>
                  {parsed.generatedAt ? new Date(parsed.generatedAt).toLocaleString() : 'No update timestamp'}
                </Text>
              </View>
            </View>
          </Card>

          <SectionHeader title="Top concern" />
          {parsed.top ? (
            <Card style={{ ...styles.concernCard, backgroundColor: t.warning + '10', borderColor: t.warning + '30' }}>
              <View style={styles.concernHeader}>
                <View style={[styles.concernIcon, { backgroundColor: t.warning + '25', borderRadius: t.radius.md }]}>
                  <IconHeartPulse size={20} color={t.warning} />
                </View>
                <View style={styles.concernTitleWrap}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>{String(parsed.top.condition ?? 'Unknown risk')}</Text>
                  <Chip label={String(parsed.top.level ?? 'unknown')} variant={riskVariant(String(parsed.top.level ?? ''))} />
                </View>
              </View>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 10, marginBottom: 12 }]}>
                Probability {(riskProgress(parsed.top.probability) * 100).toFixed(0)}%
              </Text>
              <View style={styles.barWrap}>
                <View style={[styles.barTrack, { borderRadius: t.radius.pill, overflow: 'hidden' }]}>
                  <View style={[styles.barSegGreen, { flex: 1 }]} />
                  <View style={[styles.barSegYellow, { flex: 1 }]} />
                  <View style={[styles.barSegRed, { flex: 1 }]} />
                </View>
                <View style={[styles.barMarker, { left: `${riskProgress(parsed.top.probability) * 100}%`, borderColor: t.card }]} />
              </View>
              <View style={styles.barLabels}>
                <Text style={[typography.micro, { color: t.success }]}>Low</Text>
                <Text style={[typography.micro, { color: t.warning }]}>Moderate</Text>
                <Text style={[typography.micro, { color: t.danger }]}>High</Text>
              </View>

              <Button
                label="Open full report"
                variant="soft"
                size="sm"
                style={{ marginTop: 14, alignSelf: 'flex-start' }}
                onPress={() => router.push('/insights/risk/1' as never)}
              />
            </Card>
          ) : (
            <ApiState title="No risk data yet" message="Connect more health signals to generate predictions." />
          )}

          <SectionHeader title="Other areas" />
          <Card tight>
            {parsed.others.map((row, i) => {
              const level = String(row.level ?? 'unknown');
              const condition = String(row.condition ?? 'Unknown');
              const color = riskVariant(level) === 'danger' ? t.danger : riskVariant(level) === 'warning' ? t.warning : t.success;
              return (
                <Pressable key={`${condition}-${i}`} onPress={() => router.push('/insights/risk/1' as never)} style={[styles.riskRow, { borderBottomColor: t.border }]}>
                  <View style={[styles.riskIcon, { backgroundColor: color + '18', borderRadius: t.radius.md }]}>
                    {iconForCondition(condition, color)}
                  </View>
                  <View style={styles.riskBody}>
                    <View style={styles.riskTitleRow}>
                      <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{condition}</Text>
                      <Chip label={level} variant={riskVariant(level)} />
                    </View>
                    <Text style={[typography.caption, { color: t.ink3, marginTop: 2, marginBottom: 8 }]}>
                      Probability {(riskProgress(row.probability) * 100).toFixed(0)}%
                    </Text>
                    <View style={[styles.progressTrack, { backgroundColor: t.border, borderRadius: t.radius.pill }]}>
                      <View style={[styles.progressFill, { backgroundColor: color, width: `${riskProgress(row.probability) * 100}%`, borderRadius: t.radius.pill }]} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions:       { flexDirection: 'row', gap: 4 },
  heroCard:         { marginTop: 12 },
  heroContent:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText:         { flex: 1 },
  concernCard:      {},
  concernHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  concernIcon:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  concernTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip:             { paddingHorizontal: 8, paddingVertical: 3 },
  barWrap:          { position: 'relative', marginBottom: 4 },
  barTrack:         { flexDirection: 'row', height: 8 },
  barSegGreen:      { backgroundColor: '#059669' },
  barSegYellow:     { backgroundColor: '#D97706' },
  barSegRed:        { backgroundColor: '#E54D4D' },
  barMarker:        { position: 'absolute', top: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2, marginLeft: -7 },
  barLabels:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  riskRow:          { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  riskIcon:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  riskBody:         { flex: 1 },
  riskTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack:    { height: 4, width: '100%' },
  progressFill:     { height: 4 },
});
