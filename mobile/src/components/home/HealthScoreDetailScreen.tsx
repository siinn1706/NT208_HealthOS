import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { ApiState, MissingApiState } from '../api/ApiState';
import { ProgressRing } from '../charts/ProgressRing';
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
        title="Health Score"
        left={<Text style={[typography.body, { color: t.brand }]} onPress={() => router.back()}>Back</Text>}
      />

      {score.isLoading && <ApiState title="Loading score" loading />}
      {score.error && <ApiState title="Score unavailable" message={score.error.message} actionLabel="Retry" onAction={score.reload} />}
      {score.data && (
        <>
          <View style={[styles.scoreHeader, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <ProgressRing
              value={score.data.score.value / 100}
              size={144}
              stroke={10}
              color={scoreColor(score.data.score.value / 100, t)}
              track={t.bgElev}
            >
              <Text style={[styles.bigScore, { color: t.brand }]}>{score.data.score.value}</Text>
            </ProgressRing>
            <Text style={[typography.h3, { color: t.ink, marginTop: 16 }]}>Health Score</Text>
            <Text style={[typography.body, { color: t.ink3, marginTop: 4, textAlign: 'center' }]}>{score.data.score.copy}</Text>
          </View>

          <Text style={[typography.h3, styles.sectionTitle, { color: t.ink }]}>Score inputs</Text>
          <View style={[styles.categoriesCard, { backgroundColor: t.card, borderRadius: t.radius.md }]}>
            {score.data.kpis.length === 0 && (
              <Text style={[typography.caption, { color: t.ink3 }]}>No KPI inputs returned by Core.</Text>
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
  bigScore:      { fontSize: 56, lineHeight: 64, fontFamily: 'Inter_800ExtraBold' },
  sectionTitle:  { marginTop: 20, marginBottom: 10 },
  categoriesCard:{ padding: 16, marginBottom: 16 },
  catRow:        { marginBottom: 14 },
  catLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack:      { height: 6, borderRadius: 3 },
  barFill:       { height: 6, borderRadius: 3 },
});
