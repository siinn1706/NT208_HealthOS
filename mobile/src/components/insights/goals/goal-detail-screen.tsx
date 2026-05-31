import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { Card } from '../../primitives/card';
import { SectionHeader } from '../../layout/section-header';
import { ApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService, profileService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ProgressRing } from '../../charts/progress-ring';
import { ChevronLeft, IconFire, IconTarget } from '../../../icons';
import { GoalWeightProgressCard } from './goal-weight-progress-card';
import { GoalWeightLogCard } from './goal-weight-log-card';
import { GoalWeightRecordListCard } from './goal-weight-record-list-card';
import { deriveGoalStreakSummary } from './goal-progress-derived';

export function GoalDetailScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const loadProfile = useCallback(() => profileService.me(), []);

  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);
  const profile = useApiQuery(queryKeys.profile, loadProfile);
  const progressQuery = useApiQuery(
    queryKeys.healthGoalProgress('weight_kg', '7d'),
    () => healthGoalService.progress({
      metric: 'weight_kg',
      target: goal.data?.target_weight_kg ?? 1,
      period: '7d',
    }),
    { enabled: Boolean(goal.data?.target_weight_kg) },
  );

  if (goal.isLoading || profile.isLoading) {
    return (
      <Screen>
        <ApiState title={i18n('insights.loadingGoals')} loading />
      </Screen>
    );
  }

  if (goal.error || profile.error) {
    return (
      <Screen>
        <ApiState title={i18n('insights.goalsUnavailable')} message={goal.error?.message ?? profile.error?.message} actionLabel={i18n('common.retry')} onAction={() => { goal.reload(); profile.reload(); }} />
      </Screen>
    );
  }

  if (!goal.data) {
    return (
      <Screen>
        <ApiState title={i18n('insights.noGoalConfigured')} message={i18n('insights.noGoalMessage')} actionLabel={i18n('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  if (routeId && routeId !== goal.data.id) {
    return (
      <Screen>
        <ApiState title="Goal not found" message="Requested goal id does not match current single-goal contract." actionLabel={i18n('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const target = goal.data.target_weight_kg ?? 0;
  const latestLoggedWeight = progressQuery.data?.at(-1)?.value ?? null;
  const current = latestLoggedWeight ?? profile.data?.weight_kg ?? null;
  const goalProgressRatio = current && target > 0 ? Math.max(0, Math.min(1, target / current)) : 0;
  const remaining = current && target > 0 ? Math.max(0, current - target) : null;
  const totalSteps = current && target > 0 ? Math.round(current * 1000) : 8000;
  const doneSteps  = Math.round(totalSteps * goalProgressRatio);
  const streakSummary = deriveGoalStreakSummary(progressQuery.data ?? []);

  return (
    <Screen>
      <View style={styles.backBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>{i18n('common.back')}</Text>
        </Pressable>
      </View>

      {/* Hero gradient card */}
      <LinearGradient
        colors={[t.brand, t.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: t.radius.xl }]}
      >
        {/* Decorative halo */}
        <View style={styles.halo} />

        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 4 }]}>
          {current ? `${Math.round(doneSteps).toLocaleString()} / ${totalSteps.toLocaleString()}` : `Target ${Math.round(target)} kg`}
        </Text>

        <ProgressRing
          value={goalProgressRatio}
          size={94}
          stroke={9}
          color="#fff"
          track="rgba(255,255,255,0.25)"
          glow={false}
        >
          <View style={styles.ringCenter}>
            <Text style={[styles.ringMain, { color: '#fff' }]}>
              {remaining !== null ? `${remaining.toFixed(1)}` : '--'}
            </Text>
            <Text style={[typography.micro, { color: 'rgba(255,255,255,0.75)' }]}>{i18n('insights.toGo')}</Text>
          </View>
        </ProgressRing>

        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.65)', marginTop: 8, textAlign: 'center' }]}>
          {remaining !== null ? `~${Math.ceil(remaining / 0.07)} min of walking left` : 'Current weight unavailable'}
        </Text>
      </LinearGradient>

      {/* Streak + Best stat cards */}
      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: t.warningSoft }]}>
            <IconFire size={18} color={t.warning} />
          </View>
          <Text style={[typography.h3, { color: t.ink }]}>{streakSummary.currentStreak}</Text>
          <Text style={[typography.micro, styles.upperLabel, { color: t.brand }]}>STREAK</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>Recorded days</Text>
        </Card>
        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: t.brandSoft }]}>
            <IconTarget size={18} color={t.brand} />
          </View>
          <Text style={[typography.h3, { color: t.ink }]}>{streakSummary.bestStreak}</Text>
          <Text style={[typography.micro, styles.upperLabel, { color: t.brand }]}>BEST</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>At target {streakSummary.targetHitDays} d</Text>
        </Card>
      </View>

      <SectionHeader title={i18n('insights.thisWeek')} />
      <GoalWeightProgressCard target={target} progress={progressQuery} />

      <SectionHeader title={i18n('insights.checkInHistory')} />
      <GoalWeightRecordListCard progress={progressQuery} />
      <GoalWeightLogCard onSaved={() => { void progressQuery.reload(); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  backBtn:      { flexDirection: 'row', alignItems: 'center' },
  hero:         { padding: 20, alignItems: 'center', marginTop: 4, marginBottom: 4, overflow: 'hidden' },
  halo:         { position: 'absolute', right: -30, bottom: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  ringCenter:   { alignItems: 'center' },
  ringMain:     { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  statRow:      { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4 },
  statCard:     { flex: 1, padding: 14, alignItems: 'flex-start' },
  statIcon:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  upperLabel:   { textTransform: 'uppercase' },
});
