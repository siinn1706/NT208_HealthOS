import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, MoreHorizontal,
  TrendingUp, Heart, Activity,
} from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { dashboardService } from '../../api/services';
import { useApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { toHomeView } from '../../api/viewModels';
import { ApiState } from '../api/api-state';
import { IconButton } from '../primitives/icon-button';
import { Card } from '../primitives/card';
import { GoalItem } from './today-goal-item';
import { DeltaItem } from './today-delta-item';
import { ProgressRing } from '../charts/progress-ring';
import type { ViewStyle } from 'react-native';

function formatDate() {
  return new Date().toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
}

export function TodayOverviewScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const dateLabel = useMemo(() => formatDate(), []);

  // ── existing data fetching — untouched ──────────────────────────────────
  const loadOverview = useCallback(async () => {
    const [summary, reminders, vitals] = await Promise.all([
      dashboardService.summary(),
      dashboardService.upcomingReminders(),
      dashboardService.vitals(7),
    ]);
    return toHomeView(summary, reminders, vitals);
  }, []);
  const overview = useApiQuery(`${queryKeys.dashboard}.today`, loadOverview);
  // ────────────────────────────────────────────────────────────────────────

  const data = overview.data;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: t.space[5] }]}>
        <IconButton
          variant="subtle"
          icon={<ChevronLeft size={18} color={t.ink} />}
          onPress={() => router.back()}
          accessibilityLabel={i18n('common.back')}
          size={40}
        />
        <Text style={[typography.bodyMed, { color: t.ink }]}>
          {i18n('home.today', { date: dateLabel })}
        </Text>
        <IconButton
          variant="subtle"
          icon={<MoreHorizontal size={18} color={t.ink} />}
          accessibilityLabel={i18n('common.more')}
          size={40}
          disabled
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading / error states */}
        {overview.isLoading && <ApiState title={i18n('home.loadingOverview')} loading />}
        {overview.error && (
          <ApiState
            title={i18n('home.overviewUnavailable')}
            message={overview.error.message}
            actionLabel={i18n('common.retry')}
            onAction={overview.reload}
          />
        )}

        {data && !overview.error && (() => {
          const score = data.score.value;
          const scoreLabel = score >= 80 ? i18n('home.lookingGood') : score >= 60 ? i18n('home.gettingThere') : i18n('home.needsAttention');
          const deltaBpm = data.vitals.deltaBpm;
          return (
            <>
              {/* Health score hero card */}
              <LinearGradient
                colors={[t.brand, t.brandDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, { borderRadius: t.radius.xl, margin: t.space[5], marginTop: 8 }]}
              >
                <View style={styles.heroInner}>
                  <ProgressRing value={score / 100} size={80} stroke={7} color="rgba(255,255,255,0.9)" track="rgba(255,255,255,0.2)" glow={true}>
                    <Text style={[typography.display, { color: '#FFF', fontFamily: 'Inter_800ExtraBold' }]}>{score}</Text>
                  </ProgressRing>
                  <View style={styles.heroLabels}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_700Bold', letterSpacing: 0.5, fontSize: 12, marginBottom: 4 }}>
                      {i18n('home.todaysHealth')}
                    </Text>
                    <Text style={[typography.h3, { color: '#FFF', fontFamily: 'Inter_700Bold' }]}>
                      {scoreLabel}
                    </Text>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 2 }]}>
                      {data.score.copy}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.heroBtn}
                  onPress={() => router.push('/home/score')}
                  accessibilityRole="button"
                  accessibilityLabel={i18n('home.howCalculated')}
                >
                  <Text style={[typography.caption, { color: '#FFF', fontFamily: 'Inter_600SemiBold' }]}>
                    {i18n('home.howCalculated')}
                  </Text>
                </Pressable>
              </LinearGradient>

              {/* Goals today */}
              <Text style={[typography.h3, styles.sectionTitle, { color: t.ink, paddingHorizontal: t.space[5] }]}>
                {i18n('home.goalsToday')}
              </Text>
              <Card style={StyleSheet.flatten([styles.sectionCard, { marginHorizontal: t.space[5] }]) as ViewStyle} tight>
                {data.kpis.length === 0 && (
                  <ApiState title={i18n('home.noGoals')} message={i18n('home.noGoalsMessage')} />
                )}
                {data.kpis.map((goal, i, arr) => (
                  <GoalItem
                    key={goal.id}
                    t={t}
                    icon={<Activity size={14} color={t.brand} />}
                    label={goal.label}
                    value={`${goal.val} / ${goal.tgt}`}
                    progress={goal.v}
                    met={goal.v >= 1}
                    last={i === arr.length - 1}
                  />
                ))}
              </Card>

              {/* What changed? */}
              <Text style={[typography.h3, styles.sectionTitle, { color: t.ink, paddingHorizontal: t.space[5] }]}>
                {i18n('home.whatChanged')}
              </Text>
              <Card style={StyleSheet.flatten([styles.sectionCard, { marginHorizontal: t.space[5] }]) as ViewStyle} tight>
                <DeltaItem
                  t={t}
                  icon={<Heart size={14} color={deltaBpm >= 0 ? t.success : t.danger} />}
                  label={i18n('home.heartRate')}
                  delta={i18n('home.heartRateDelta', { delta: `${deltaBpm >= 0 ? '+' : ''}${deltaBpm}` })}
                  value={`${data.vitals.avg} ${i18n('common.bpm')}`}
                  positive={deltaBpm >= 0}
                  last={false}
                />
                <DeltaItem
                  t={t}
                  icon={<TrendingUp size={14} color={t.success} />}
                  label={i18n('home.healthScore')}
                  delta={i18n('home.healthScoreDelta')}
                  value={`${score} ${i18n('common.pts')}`}
                  positive
                  last
                />
              </Card>
            </>
          );
        })()}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52 },
  scroll:      { flex: 1 },
  content:     {},
  heroCard:    { overflow: 'hidden' },
  heroInner:   { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  heroLabels:  { flex: 1 },
  heroBtn:     { marginHorizontal: 18, marginBottom: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center' },
  sectionTitle:{ marginTop: 20, marginBottom: 8 },
  sectionCard: { padding: 0, overflow: 'hidden' },
});
