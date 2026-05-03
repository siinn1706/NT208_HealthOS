import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { TopBar } from '../../layout/TopBar';
import { SectionHeader } from '../../layout/SectionHeader';
import { IconButton } from '../../primitives/IconButton';
import { ApiState } from '../../api/ApiState';
import { InsightsSegmentedTabs } from '../insights-segmented-tabs';
import { GoalCard } from './goal-card';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { useApiQuery } from '../../../api/query';
import { healthGoalService, profileService, reminderService } from '../../../api/services';
import { queryKeys } from '../../../api/queryKeys';
import { IconBell, IconPlus, ChevronRight, IconTarget } from '../../../icons';

function CheckInRing({ done, total }: { done: number; total: number }) {
  return (
    <View style={styles.ringWrap}>
      <View style={styles.ringOuter}>
        <Text style={[typography.title, { color: '#fff' }]}>{done}</Text>
        <Text style={[typography.micro, { color: 'rgba(255,255,255,0.7)', marginTop: -2 }]}>of {total}</Text>
      </View>
    </View>
  );
}

export function GoalsHubScreen() {
  const t = useTheme();

  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const loadProfile = useCallback(() => profileService.me(), []);
  const loadReminders = useCallback(() => reminderService.list(), []);

  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);
  const profile = useApiQuery(queryKeys.profile, loadProfile);
  const reminders = useApiQuery(queryKeys.remindersAll, loadReminders);

  const goalCard = useMemo(() => {
    if (!goal.data) return null;
    const target = goal.data.target_weight_kg ?? 0;
    const current = profile.data?.weight_kg ?? null;
    const progress = current && target > 0 ? Math.max(0, Math.min(1, target / current)) : 0;
    const deadline = goal.data.deadline ? new Date(goal.data.deadline).toLocaleDateString() : 'No deadline';
    return {
      id: goal.data.id,
      title: 'Target weight',
      sub: current ? `${Math.round(current)} kg → ${Math.round(target)} kg` : `Target ${Math.round(target)} kg`,
      progress,
      streak: (reminders.data ?? []).filter((r) => r.done).length,
      done: current ? current <= target : false,
      deadline,
    };
  }, [goal.data, profile.data, reminders.data]);

  const totalChecks = reminders.data?.length ?? 0;
  const doneChecks = (reminders.data ?? []).filter((r) => r.done).length;
  const loading = goal.isLoading || profile.isLoading || reminders.isLoading;
  const error = goal.error ?? profile.error ?? reminders.error;

  return (
    <Screen>
      <TopBar
        title="Insights"
        subtitle="Reports · Risks · Goals"
        right={
          <View style={styles.topActions}>
            <IconButton icon={<IconBell size={20} color={t.ink3} />} accessibilityLabel="Alerts" onPress={() => router.push('/reminders/notifications' as never)} />
            <IconButton icon={<IconPlus size={20} color={t.ink3} />} accessibilityLabel="New goal" onPress={() => router.push('/insights/goals/create' as never)} />
          </View>
        }
      />

      <InsightsSegmentedTabs active="goals" />

      {loading && <ApiState title="Loading goals" loading />}
      {error && <ApiState title="Goals unavailable" message={error.message} actionLabel="Retry" onAction={() => { goal.reload(); profile.reload(); reminders.reload(); }} />}

      {!loading && !error && (
        <>
          <View style={[styles.heroCard, { backgroundColor: t.brand, borderRadius: t.radius.xl }]}>
            <View style={styles.heroInner}>
              <CheckInRing done={doneChecks} total={Math.max(totalChecks, 1)} />
              <View style={styles.heroText}>
                <Text style={[typography.h3, { color: '#fff' }]}>{doneChecks} of {totalChecks} check-ins done</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginTop: 4 }]}>
                  Based on current reminder completion
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/insights/goals/streaks' as never)}
            style={[styles.streakStrip, { backgroundColor: t.warning + '15', borderColor: t.warning + '30', borderRadius: t.radius.lg }]}
          >
            <Text style={[typography.h3, { color: t.warning }]}>🔥 {doneChecks}-day streak</Text>
            <View style={styles.streakRight}>
              <Text style={[typography.caption, { color: t.ink3 }]}>Keep tracking</Text>
              <ChevronRight size={16} color={t.ink3} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>

          <SectionHeader
            title="Active Goals"
            action="+ New"
            onActionPress={() => router.push('/insights/goals/create' as never)}
          />

          {!goalCard && (
            <ApiState title="No goal configured" message="Create a health goal to track progress from real profile data." />
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
            <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>🏅 View Milestones</Text>
            <ChevronRight size={18} color={t.ink3} />
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions:    { flexDirection: 'row', gap: 4 },
  heroCard:      { padding: 20, marginTop: 12, marginBottom: 12 },
  heroInner:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringWrap:      { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999 },
  ringOuter:     { alignItems: 'center', justifyContent: 'center' },
  heroText:      { flex: 1 },
  streakStrip:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginBottom: 4, borderWidth: StyleSheet.hairlineWidth },
  streakRight:   { flexDirection: 'row', alignItems: 'center' },
  milestonesRow: { flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 8, borderWidth: StyleSheet.hairlineWidth },
});
