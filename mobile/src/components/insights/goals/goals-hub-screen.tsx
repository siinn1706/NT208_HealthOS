import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../layout/Screen';
import { TopBar } from '../../layout/TopBar';
import { SectionHeader } from '../../layout/SectionHeader';
import { IconButton } from '../../primitives/IconButton';
import { ApiState } from '../../api/ApiState';
import { InsightsSegmentedTabs } from '../insights-segmented-tabs';
import { GoalCard } from './goal-card';
import { ProgressRing } from '../../charts/ProgressRing';
import { useTheme } from '../../../theme/useTheme';
import { useThemeContext } from '../../../theme/ThemeProvider';
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
      title: 'Target weight',
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
        title="Insights"
        subtitle="Reports · Risks · Goals"
        right={
          <View style={styles.topActions}>
            <IconButton
              icon={<IconBell size={20} color={t.ink3} />}
              accessibilityLabel="Alerts"
              onPress={() => router.push('/reminders/notifications' as never)}
            />
            <IconButton
              icon={<IconPlus size={20} color={t.ink3} />}
              accessibilityLabel="New goal"
              onPress={() => router.push('/insights/goals/create' as never)}
            />
          </View>
        }
      />

      <InsightsSegmentedTabs active="goals" />

      {loading && <ApiState title="Loading goals" loading />}
      {error && (
        <ApiState
          title="Goals unavailable"
          message={error.message}
          actionLabel="Retry"
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
                    <Text style={[typography.micro, { color: 'rgba(255,255,255,0.75)' }]}>of {Math.max(totalChecks, 1)}</Text>
                  </View>
                </ProgressRing>

                <View style={styles.heroText}>
                  <Text style={[typography.title, { color: '#fff' }]}>
                    {doneChecks} of {totalChecks} check-ins done
                  </Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginTop: 4 }]}>
                    Based on current reminder completion
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
              <Text style={[typography.bodyMed, { color: t.ink }]}>{doneChecks}-day streak</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>Keep tracking daily</Text>
            </View>
            <View style={styles.streakRight}>
              <Text style={[typography.caption, { color: t.brand }]}>Manage</Text>
              <ChevronRight size={16} color={t.ink4} style={{ marginLeft: 2 }} />
            </View>
          </Pressable>

          <SectionHeader
            title="Active Goals"
            action="+ New"
            onActionPress={() => router.push('/insights/goals/create' as never)}
          />

          {!goalCard && (
            <ApiState
              title="No goal configured"
              message="Create a health goal to track progress from real profile data."
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
