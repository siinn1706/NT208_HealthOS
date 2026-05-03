import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { Button } from '../../primitives/Button';
import { Card } from '../../primitives/Card';
import { SectionHeader } from '../../layout/SectionHeader';
import { ApiState, MissingApiState } from '../../api/ApiState';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService, profileService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft, IconMore, IconTarget } from '../../../icons';

export function GoalDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const loadProfile = useCallback(() => profileService.me(), []);

  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);
  const profile = useApiQuery(queryKeys.profile, loadProfile);

  if (goal.isLoading || profile.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading goal" loading />
      </Screen>
    );
  }

  if (goal.error || profile.error) {
    return (
      <Screen>
        <ApiState title="Goal unavailable" message={goal.error?.message ?? profile.error?.message} actionLabel="Retry" onAction={() => { goal.reload(); profile.reload(); }} />
      </Screen>
    );
  }

  if (!goal.data) {
    return (
      <Screen>
        <ApiState title="No goal configured" message="Create a health goal first." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  if (routeId && routeId !== goal.data.id) {
    return (
      <Screen>
        <ApiState title="Goal not found" message="Requested goal id does not match current single-goal contract." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const target = goal.data.target_weight_kg ?? 0;
  const current = profile.data?.weight_kg ?? null;
  const progress = current && target > 0 ? Math.max(0, Math.min(1, target / current)) : 0;
  const remaining = current && target > 0 ? Math.max(0, current - target) : null;

  return (
    <Screen>
      <View style={styles.backBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>Back</Text>
        </Pressable>
        <Pressable hitSlop={8}>
          <IconMore size={22} color={t.ink3} />
        </Pressable>
      </View>

      <View style={[styles.hero, { backgroundColor: t.brand + '12', borderRadius: t.radius.xl }]}>
        <View style={[styles.heroIcon, { backgroundColor: t.brand + '22', borderRadius: t.radius.md }]}>
          <IconTarget size={28} color={t.brand} />
        </View>
        <Text style={[typography.title, { color: t.ink, marginTop: 12 }]}>Target weight</Text>
        <Text style={[typography.h3, { color: t.ink3, marginTop: 4 }]}>
          {current ? `${Math.round(current)} kg → ${Math.round(target)} kg` : `Target ${Math.round(target)} kg`}
        </Text>
        <View style={[styles.heroBar, { backgroundColor: t.border, borderRadius: t.radius.pill, marginTop: 16 }]}>
          <View style={[styles.heroFill, { backgroundColor: t.brand, borderRadius: t.radius.pill, width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6 }]}>
          {remaining !== null ? `${remaining.toFixed(1)} kg remaining` : 'Current weight unavailable'}
        </Text>
      </View>

      <SectionHeader title="This Week" />
      <Card>
        {/* TODO(api): propose GET /v1/health-goals/{id}/progress?period=7d for chartable daily progress */}
        <MissingApiState title="Weekly progress chart unavailable" contract="TODO: GET /v1/health-goals/{id}/progress?period=7d" />
      </Card>

      <SectionHeader title="Check-in History" />
      <Card>
        {/* TODO(api): propose GET /v1/health-goals/{id}/checkins for event-level completion history */}
        <MissingApiState title="Check-in history unavailable" contract="TODO: GET /v1/health-goals/{id}/checkins" />
      </Card>

      <SectionHeader title="Streak" />
      <Card>
        {/* TODO(api): propose GET /v1/health-goals/{id}/streaks/summary for current and best streak fields */}
        <MissingApiState title="Streak summary unavailable" contract="TODO: GET /v1/health-goals/{id}/streaks/summary" />
      </Card>

      <View style={styles.footer}>
        <Button label="Log Progress" disabled />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  hero: { padding: 20, alignItems: 'center', marginTop: 4, marginBottom: 4 },
  heroIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  heroBar: { width: '100%', height: 8 },
  heroFill: { height: 8 },
  footer: { paddingTop: 16 },
});
