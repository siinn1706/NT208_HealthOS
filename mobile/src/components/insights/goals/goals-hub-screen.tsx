import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { TopBar } from '../../layout/top-bar';
import { SectionHeader } from '../../layout/section-header';
import { IconButton } from '../../primitives/icon-button';
import { ApiState } from '../../api/api-state';
import { InsightsSegmentedTabs } from '../insights-segmented-tabs';
import { GoalCard } from './goal-card';
import { ProgressRing } from '../../charts/progress-ring';
import { useTheme } from '../../../theme/useTheme';
import { useThemeContext } from '../../../theme/theme-provider';
import { typography } from '../../../theme/typography';
import { useApiQuery } from '../../../api/query';
import { healthGoalService, profileService, reminderService } from '../../../api/services';
import { queryKeys } from '../../../api/queryKeys';
import { IconBell, IconPlus, ChevronRight, IconTarget } from '../../../icons';

// Hero gradient colors per theme
function heroGradient(themeName: string): [string, string] {
  if (themeName === 'night') return ['#1A4060', '#0B2030'];
  if (themeName === 'warm')  return ['#8C5A2A', '#C4854A'];
  return ['#1965B3', '#3A8FD4']; // calm
}

// Decorative blob opacity per theme
function blobOpacity(themeName: string): number {
  if (themeName === 'night') return 0.12;
  if (themeName === 'warm')  return 0.15;
  return 0.15;
}

export function GoalsHubScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const { name: themeName } = useThemeContext();

  const loadGoal     = useCallback(() => healthGoalService.current(), []);
  const loadProfile  = useCallback(() => profileService.me(), []);
  const loadReminders = useCallback(() => reminderService.list(), []);

  const goal      = useApiQuery(queryKeys.healthGoal, loadGoal);
  const profile   = useApiQuery(queryKeys.profile, loadProfile);
  const reminders = useApiQuery(queryKeys.remindersAll, loadReminders);

  const goalCard = useMemo(() => {
    if (!goal.data) return null;
    const target  = goal.data.target_weight_kg ?? 0;
    const current = profile.data?.weight_kg ?? null;
    const progress = current && target > 0 ? Math.max(0, Math.min(1, target / current)) : 0;
    const deadline = goal.data.deadline ? new Date(goal.data.deadline).toLocaleDateString() : 'No deadline';
    return {
      id: goal.data.id,
      title: i18n('insights.targetWeight'),
      sub: current ? `${Math.round(current)} kg → ${Math.round(target)} kg` : `Target ${Math.round(target)} kg`,
      progress,
      streak: (reminders.data ?? []).filter((r) => r.done).length,
      done: current ? current <= target : false,
      deadline,
    };
  }, [goal.data, profile.data, reminders.data]);

  const totalChecks = reminders.data?.length ?? 0;
  const doneChecks  = (reminders.data ?? []).filter((r) => r.done).length;
  const checkRatio  = totalChecks > 0 ? doneChecks / totalChecks : 0;
  const loading = goal.isLoading || profile.isLoading || reminders.isLoading;
  const error   = goal.error ?? profile.error ?? reminders.error;

  const [gradStart, gradEnd] = heroGradient(themeName);

  return (
    <Screen>
      <TopBar
        title={i18n('insights.title')}
        subtitle={i18n('insights.subtitle')}
        right={
          <View style={styles.topActions}>
            <IconButton
              icon={<IconBell size={20} color={t.ink3} />}
              accessibilityLabel={i18n('insights.alerts')}
              onPress={() => router.push('/reminders/notifications' as never)}
            />
            <IconButton
              icon={<IconPlus size={20} color={t.ink3} />}
              accessibilityLabel={i18n('insights.newGoal')}
              onPress={() => router.push('/insights/goals/create' as never)}
            />
          </View>
        }
      />

      <InsightsSegmentedTabs active="goals" />

      {loading && <ApiState title={i18n('insights.loadingGoals')} loading />}
      {error && (
        <ApiState
          title={i18n('insights.goalsUnavailable')}
          message={error.message}
          actionLabel={i18n('common.retry')}
          onAction={() => { goal.reload(); profile.reload(); reminders.reload(); }}
        />
      )}

      {!loading && !error && (
        <>
          {/* Hero card: gradient + decorative blob + check-in ring */}
          <View style={[styles.heroWrap, { borderRadius: t.radius.xl, overflow: 'hidden' }]}>
            <LinearGradient
              colors={[gradStart, gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroGrad}
            >
              {/* Decorative circle clipped at right edge */}
              <View
                pointerEvents="none"
                style={[
                  styles.heroBlobRight,
                  { backgroundColor: `rgba(255,255,255,${blobOpacity(themeName)})` },
                ]}
              />

              <View style={styles.heroInner}>
                {/* Check-in ring */}
                <ProgressRing
                  value={checkRatio}
                  size={76}
                  stroke={7}
                  color="#fff"
                  track="rgba(255,255,255,0.25)"
                >
                  <View style={styles.ringCenter}>
                    <Text style={[typography.title, { color: '#fff', lineHeight: 22 }]}>{doneChecks}</Text>
                    <Text style={[typography.micro, { color: 'rgba(255,255,255,0.75)' }]}>/ {Math.max(totalChecks, 1)}</Text>
                  </View>
                </ProgressRing>

                <View style={styles.heroText}>
                  <Text style={[typography.title, { color: '#fff' }]}>
                    {i18n('insights.checkInsDone', { done: doneChecks, total: totalChecks })}
                  </Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginTop: 4 }]}>
                    {i18n('insights.basedOnReminders')}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Streak strip */}
          <Pressable
            onPress={() => router.push('/insights/goals/streaks' as never)}
            style={[
              styles.streakStrip,
              { backgroundColor: t.warning + '15', borderColor: t.warning + '30', borderRadius: t.radius.lg },
            ]}
          >
            <View style={[styles.streakIcon, { backgroundColor: t.warning + '25', borderRadius: t.radius.sm }]}>
              <Text style={{ fontSize: 18 }}>🔥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{i18n('insights.dayStreak', { count: doneChecks })}</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>{i18n('insights.keepTracking')}</Text>
            </View>
            <View style={styles.streakRight}>
              <Text style={[typography.caption, { color: t.brand }]}>{i18n('common.manage')}</Text>
              <ChevronRight size={16} color={t.ink4} style={{ marginLeft: 2 }} />
            </View>
          </Pressable>

          <SectionHeader
            title={i18n('insights.activeGoals')}
            action={i18n('common.new')}
            onActionPress={() => router.push('/insights/goals/create' as never)}
          />

          {!goalCard && (
            <ApiState
              title={i18n('insights.noGoalConfigured')}
              message={i18n('insights.noGoalMessage')}
            />
          )}
          {goalCard && (
            <GoalCard
              title={goalCard.title}
              sub={`${goalCard.sub} · ${goalCard.deadline}`}
              icon={<IconTarget size={18} color="#fff" />}
              progress={goalCard.progress}
              streak={goalCard.streak}
              done={goalCard.done}
              color={t.brand}
              onPress={() => router.push(`/insights/goals/${goalCard.id}` as never)}
            />
          )}

          <Pressable
            onPress={() => router.push('/insights/goals/milestones' as never)}
            style={[styles.milestonesRow, { borderColor: t.border, borderRadius: t.radius.lg, backgroundColor: t.card }]}
          >
            <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{i18n('insights.viewMilestones')}</Text>
            <ChevronRight size={18} color={t.ink3} />
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions:    { flexDirection: 'row', gap: 4 },
  heroWrap:      { marginTop: 12, marginBottom: 12 },
  heroGrad:      { padding: 20, minHeight: 120 },
  heroBlobRight: {
    position: 'absolute', right: -32, top: -12,
    width: 140, height: 140, borderRadius: 70,
  },
  heroInner:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringCenter:    { alignItems: 'center', justifyContent: 'center' },
  heroText:      { flex: 1 },
  streakStrip:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 4, borderWidth: StyleSheet.hairlineWidth },
  streakIcon:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  streakRight:   { flexDirection: 'row', alignItems: 'center' },
  milestonesRow: { flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 8, borderWidth: StyleSheet.hairlineWidth },
});
