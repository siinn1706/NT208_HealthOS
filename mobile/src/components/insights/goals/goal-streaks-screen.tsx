import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../layout/Screen';
import { Card } from '../../primitives/Card';
import { SectionHeader } from '../../layout/SectionHeader';
import { ApiState, MissingApiState } from '../../api/ApiState';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft } from '../../../icons';

export function GoalStreaksScreen() {
  const t = useTheme();
  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);

  if (goal.isLoading) {
    return (
      <Screen>
        <ApiState title="Loading streaks" loading />
      </Screen>
    );
  }

  if (goal.error) {
    return (
      <Screen>
        <ApiState title="Streaks unavailable" message={goal.error.message} actionLabel="Retry" onAction={goal.reload} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backBar}>
        <ChevronLeft size={20} color={t.ink} />
        <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>Streaks</Text>
      </Pressable>

      <View style={[styles.hero, { backgroundColor: t.warning + '15', borderRadius: t.radius.xl }]}>
        <Text style={styles.fireEmoji}>🔥</Text>
        <Text style={[typography.h3, { color: t.ink, marginTop: 6 }]}>
          {goal.data ? `Goal target: ${Math.round(goal.data.target_weight_kg ?? 0)} kg` : 'No active goal'}
        </Text>
        <Text style={[typography.body, { color: t.ink3, marginTop: 4 }]}>
          Streak timeline needs dedicated backend support.
        </Text>
      </View>

      <SectionHeader title="Streak Calendar" />
      <Card>
        {/* TODO(api): propose GET /v1/health-goals/{id}/streaks?period=month for daily completion history */}
        <MissingApiState title="Calendar streak data unavailable" contract="TODO: GET /v1/health-goals/{id}/streaks?period=month" />
      </Card>

      <SectionHeader title="By Goal" />
      <Card>
        {/* TODO(api): propose GET /v1/health-goals/{id}/streaks/summary for per-goal current/best streak */}
        <MissingApiState title="Per-goal streak summary unavailable" contract="TODO: GET /v1/health-goals/{id}/streaks/summary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  hero: { padding: 24, alignItems: 'center', marginTop: 4, marginBottom: 4 },
  fireEmoji: { fontSize: 48 },
});
