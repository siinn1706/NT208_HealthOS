import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { SectionHeader } from '../../layout/SectionHeader';
import { ApiState, MissingApiState } from '../../api/ApiState';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft } from '../../../icons';

export function GoalMilestonesScreen() {
  const t = useTheme();
  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);

  if (goal.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading milestones" loading />
      </Screen>
    );
  }

  if (goal.error) {
    return (
      <Screen>
        <ApiState title="Milestones unavailable" message={goal.error.message} actionLabel="Retry" onAction={goal.reload} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backBar}>
        <ChevronLeft size={20} color={t.ink} />
        <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>Milestones</Text>
      </Pressable>

      <View style={[styles.summaryPill, { backgroundColor: t.brandSoft, borderRadius: t.radius.pill }]}>
        <Text style={[typography.bodyMed, { color: t.brand }]}>
          {goal.data ? `Active goal target ${Math.round(goal.data.target_weight_kg ?? 0)} kg` : 'No active goal'}
        </Text>
      </View>

      <SectionHeader title="Earned" />
      {/* TODO(api): propose GET /v1/health-goals/{id}/milestones for earned milestone badges */}
      <MissingApiState title="Earned milestones unavailable" contract="TODO: GET /v1/health-goals/{id}/milestones" />

      <SectionHeader title="Upcoming" />
      {/* TODO(api): propose GET /v1/health-goals/{id}/milestones/progress for progress toward milestone badges */}
      <MissingApiState title="Upcoming milestone progress unavailable" contract="TODO: GET /v1/health-goals/{id}/milestones/progress" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  summaryPill: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4 },
});
