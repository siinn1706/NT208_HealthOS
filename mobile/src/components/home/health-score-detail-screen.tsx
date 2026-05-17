import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { ApiState, MissingApiState } from '../api/api-state';
import { ProgressRing } from '../charts/progress-ring';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { dashboardService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { toHomeView } from '../../api/viewModels';

function scoreColor(pct: number, t: ReturnType<typeof useTheme>): string {
  if (pct >= 0.8) return t.success;
  if (pct >= 0.6) return t.warning;
  return t.danger;
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
    return toHomeView(summary, reminders, vitals);
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
      <MissingApiState title="Detailed score formula unavailable" contract="existing API needs adaptation" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreHeader:   { alignItems: 'center', padding: 28, marginVertical: 8 },
  scoreCenterCol:{ alignItems: 'center' },
  bigScore:      { fontSize: 56, lineHeight: 64, fontFamily: 'Inter_800ExtraBold' },
  sectionTitle:  { marginTop: 20, marginBottom: 10 },
  categoriesCard:{ padding: 16, marginBottom: 16 },
  catRow:        { marginBottom: 14 },
  catLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack:      { height: 4, borderRadius: 2 },
  barFill:       { height: 4, borderRadius: 2 },
});
