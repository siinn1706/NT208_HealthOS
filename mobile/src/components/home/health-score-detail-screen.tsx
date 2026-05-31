import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { ApiState } from '../api/api-state';
import { ProgressRing } from '../charts/progress-ring';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { dashboardService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { toHomeView } from '../../api/viewModels';
import type { DashboardGoal, DashboardSummary } from '../../../../shared/api-contracts';

function scoreColor(pct: number, t: ReturnType<typeof useTheme>): string {
  if (pct >= 0.8) return t.success;
  if (pct >= 0.6) return t.warning;
  return t.danger;
}

type ScoreFormulaRow = {
  id: string;
  label: string;
  value: string;
  progress: number;
};

type ScoreFormula = {
  sourceKey: string;
  detailKey: string;
  rows: ScoreFormulaRow[];
};

function clampRatio(current: number | null | undefined, target: number | null | undefined) {
  if (!current || !target || target <= 0) return 0;
  return Math.max(0, Math.min(1, current / target));
}

function labelize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatGoalValue(goal: DashboardGoal) {
  const current = goal.current ?? 0;
  const target = goal.target ?? 0;
  return `${Math.round(current).toLocaleString()} / ${Math.round(target).toLocaleString()} ${goal.unit}`;
}

function buildScoreFormula(summary: DashboardSummary): ScoreFormula {
  const healthScore = summary.kpis.health_score;
  if (typeof healthScore?.current === 'number') {
    return {
      sourceKey: 'home.scoreFormulaCore',
      detailKey: 'home.scoreFormulaCoreDetail',
      rows: [{
        id: 'health_score',
        label: 'Health score KPI',
        value: `${Math.round(healthScore.current)} / ${Math.round(healthScore.target ?? 100)}`,
        progress: clampRatio(healthScore.current, healthScore.target ?? 100),
      }],
    };
  }

  return {
    sourceKey: 'home.scoreFormulaGoals',
    detailKey: 'home.scoreFormulaGoalsDetail',
    rows: (summary.goals ?? []).map((goal) => ({
      id: goal.id,
      label: labelize(goal.key),
      value: formatGoalValue(goal),
      progress: clampRatio(goal.current, goal.target),
    })),
  };
}

function ScoreFormulaCard({ formula }: { formula: ScoreFormula }) {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  return (
    <View style={[styles.formulaCard, { backgroundColor: t.card, borderRadius: t.radius.md }]}>
      <Text style={[typography.bodyMed, { color: t.ink }]}>{i18n(formula.sourceKey)}</Text>
      <Text style={[typography.caption, { color: t.ink3, marginTop: 4 }]}>{i18n(formula.detailKey)}</Text>
      {formula.rows.length === 0 ? (
        <Text style={[typography.caption, { color: t.ink3, marginTop: 12 }]}>{i18n('home.scoreFormulaUnavailable')}</Text>
      ) : (
        <View style={styles.formulaRows}>
          {formula.rows.map((row) => (
            <View key={row.id} style={styles.formulaRow}>
              <View style={styles.formulaTopRow}>
                <Text style={[typography.bodyMed, styles.formulaLabel, { color: t.ink }]}>{row.label}</Text>
                <Text style={[typography.caption, styles.formulaValue, { color: t.ink3 }]}>{row.value}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: t.bgElev }]}>
                <View style={[styles.barFill, { width: `${Math.round(row.progress * 100)}%` as any, backgroundColor: scoreColor(row.progress, t) }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function HealthScoreDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadSummary = useCallback(async () => {
    const [summary, reminders, vitals] = await Promise.all([
      dashboardService.summary(),
      dashboardService.upcomingReminders(),
      dashboardService.vitals(7),
    ]);
    return {
      ...toHomeView(summary, reminders, vitals),
      scoreFormula: buildScoreFormula(summary),
    };
  }, []);
  const score = useApiQuery(`${queryKeys.dashboard}.score`, loadSummary);

  return (
    <Screen>
      <TopBar
        title={i18n('home.healthScore')}
        left={<Text style={[typography.body, { color: t.brand }]} onPress={() => router.back()}>{i18n('common.back')}</Text>}
      />

      {score.isLoading && <ApiState title={i18n('home.loadingScore')} loading />}
      {score.error && <ApiState title={i18n('home.scoreUnavailable')} message={score.error.message} actionLabel={i18n('common.retry')} onAction={score.reload} />}
      {score.data && (
        <>
          <View style={[styles.scoreHeader, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <ProgressRing
              value={score.data.score.value / 100}
              size={144}
              stroke={12}
              color={scoreColor(score.data.score.value / 100, t)}
              track={t.bgElev}
            >
              <View style={styles.scoreCenterCol}>
                <Text style={[styles.bigScore, { color: t.brand }]}>{score.data.score.value}</Text>
                <Text style={[typography.caption, { color: t.ink3, textAlign: 'center', marginTop: -2 }]}>/100</Text>
              </View>
            </ProgressRing>
            <Text style={[typography.h3, { color: t.ink, marginTop: 16 }]}>{i18n('home.healthScore')}</Text>
            <Text style={[typography.body, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>{score.data.score.copy}</Text>
          </View>

          <Text style={[typography.h3, styles.sectionTitle, { color: t.ink }]}>{i18n('home.currentFormula')}</Text>
          <ScoreFormulaCard formula={score.data.scoreFormula} />

          <Text style={[typography.h3, styles.sectionTitle, { color: t.ink }]}>{i18n('home.scoreInputs')}</Text>
          <View style={[styles.categoriesCard, { backgroundColor: t.card, borderRadius: t.radius.md }]}>
            {score.data.kpis.length === 0 && (
              <Text style={[typography.caption, { color: t.ink3 }]}>{i18n('home.noKpiInputs')}</Text>
            )}
            {score.data.kpis.map((item) => (
              <View key={item.id} style={styles.catRow}>
                <View style={styles.catLabelRow}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>{item.label}</Text>
                  <Text style={[typography.bodyMed, { color: scoreColor(item.v, t) }]}>{Math.round(item.v * 100)}%</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: t.bgElev }]}>
                  <View style={[styles.barFill, { width: `${Math.round(item.v * 100)}%` as any, backgroundColor: scoreColor(item.v, t) }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreHeader:   { alignItems: 'center', padding: 28, marginVertical: 8 },
  scoreCenterCol:{ alignItems: 'center' },
  bigScore:      { fontSize: 56, lineHeight: 64, fontFamily: 'Inter_800ExtraBold' },
  sectionTitle:  { marginTop: 20, marginBottom: 10 },
  categoriesCard:{ padding: 16, marginBottom: 16 },
  formulaCard:   { padding: 16, marginBottom: 4 },
  formulaRows:   { gap: 14, marginTop: 14 },
  formulaRow:    { gap: 6 },
  formulaTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  formulaLabel:  { flex: 1 },
  formulaValue:  { flexShrink: 1, textAlign: 'right' },
  catRow:        { marginBottom: 14 },
  catLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack:      { height: 4, borderRadius: 2 },
  barFill:       { height: 4, borderRadius: 2 },
});
