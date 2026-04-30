import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { ApiState } from '../api/ApiState';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { dashboardService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { toHomeView } from '../../api/viewModels';

export function TodayOverviewScreen() {
  const t = useTheme();
  const loadOverview = useCallback(async () => {
    const [summary, reminders, vitals] = await Promise.all([
      dashboardService.summary(),
      dashboardService.upcomingReminders(),
      dashboardService.vitals(7),
    ]);
    return toHomeView(summary, reminders, vitals);
  }, []);
  const overview = useApiQuery(`${queryKeys.dashboard}.today`, loadOverview);

  return (
    <Screen>
      <TopBar
        title="Today's Overview"
        left={<Text style={[typography.body, { color: t.primary }]} onPress={() => router.back()}>Back</Text>}
      />

      {overview.isLoading && <ApiState title="Loading overview" loading />}
      {overview.error && <ApiState title="Overview unavailable" message={overview.error.message} actionLabel="Retry" onAction={overview.reload} />}

      {overview.data && (
        <>
          <LinearGradient
            colors={[t.primary, t.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderRadius: t.radius.xl }]}
          >
            <View style={styles.heroInner}>
              <View style={styles.heroText}>
                <Text style={[typography.caption, styles.heroCaption]}>Today's health score</Text>
                <Text style={[typography.display, styles.heroScore]}>{overview.data.score.value}</Text>
                <Text style={[typography.body, styles.heroLabel]}>{overview.data.score.copy}</Text>
              </View>
            </View>
          </LinearGradient>

          <Text style={[typography.h3, styles.sectionTitle, { color: t.ink }]}>Goals</Text>
          {overview.data.kpis.length === 0 && <ApiState title="No goals returned" message="Core dashboard goals will appear here." />}
          {overview.data.kpis.map((goal) => (
            <View key={goal.id} style={[styles.goalRow, { backgroundColor: t.card, borderRadius: t.radius.md }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.goalMeta}>
                  <Text style={[typography.bodyMed, { color: t.ink }]}>{goal.label}</Text>
                  <Text style={[typography.caption, { color: t.ink3 }]}>{goal.val} / {goal.tgt}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: t.bgElev }]}>
                  <View style={[styles.barFill, { width: `${Math.round(goal.v * 100)}%` as any, backgroundColor: goal.color }]} />
                </View>
              </View>
            </View>
          ))}

          <View style={[styles.nextCard, { backgroundColor: t.brandSoft, borderRadius: t.radius.md }]}>
            <Text style={[typography.caption, { color: t.primary }]}>NEXT UP</Text>
            <Text style={[typography.body, { color: t.ink, marginTop: 4 }]}>
              {overview.data.nextUp[0]?.title ?? 'No reminders scheduled.'}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero:        { marginVertical: 8 },
  heroInner:   { flexDirection: 'row', alignItems: 'center', padding: 20 },
  heroText:    { flex: 1 },
  heroCaption: { color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  heroScore:   { color: '#fff', marginBottom: 2 },
  heroLabel:   { color: '#fff', fontWeight: '600' as any },
  sectionTitle:{ marginTop: 20, marginBottom: 8 },
  goalRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8 },
  goalMeta:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack:    { height: 6, borderRadius: 3 },
  barFill:     { height: 6, borderRadius: 3 },
  nextCard:    { padding: 16, marginTop: 16, marginBottom: 8 },
});
