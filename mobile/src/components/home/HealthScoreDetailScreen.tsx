import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { ApiState, MissingApiState } from '../api/ApiState';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { dashboardService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { toHomeView } from '../../api/viewModels';

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
        left={<Text style={[typography.body, { color: t.primary }]} onPress={() => router.back()}>Back</Text>}
      />

      {score.isLoading && <ApiState title="Loading score" loading />}
      {score.error && <ApiState title="Score unavailable" message={score.error.message} actionLabel="Retry" onAction={score.reload} />}
      {score.data && (
        <>
          <View style={[styles.scoreHeader, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
            <Text style={[typography.display, styles.bigScore, { color: t.primary }]}>{score.data.score.value}</Text>
            <Text style={[typography.h3, { color: t.ink }]}>Health Score</Text>
            <Text style={[typography.body, { color: t.ink3, marginTop: 4 }]}>{score.data.score.copy}</Text>
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
                  <Text style={[typography.bodyMed, { color: item.color }]}>{Math.round(item.v * 100)}%</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: t.bgElev }]}>
                  <View style={[styles.barFill, { width: `${Math.round(item.v * 100)}%` as any, backgroundColor: item.color }]} />
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
  bigScore:      { fontSize: 72, lineHeight: 80 },
  sectionTitle:  { marginTop: 20, marginBottom: 10 },
  categoriesCard:{ padding: 16, marginBottom: 16 },
  catRow:        { marginBottom: 14 },
  catLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack:      { height: 8, borderRadius: 4 },
  barFill:       { height: 8, borderRadius: 4 },
});
