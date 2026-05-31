import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type DimensionValue } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { Card } from '../../primitives/card';
import { SectionHeader } from '../../layout/section-header';
import { ApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft, IconActivity, IconBadge, IconFire, IconLock, IconTarget } from '../../../icons';
import {
  deriveGoalMilestones,
  summarizeGoalMilestones,
  type GoalMilestone,
  type GoalMilestoneIcon,
} from './goal-progress-derived';

function iconForMilestone(icon: GoalMilestoneIcon, color: string) {
  if (icon === 'activity') return <IconActivity size={18} color={color} />;
  if (icon === 'fire') return <IconFire size={18} color={color} />;
  if (icon === 'badge') return <IconBadge size={18} color={color} />;
  return <IconTarget size={18} color={color} />;
}

function statusColor(status: GoalMilestone['status'], t: ReturnType<typeof useTheme>) {
  if (status === 'earned') return t.success;
  if (status === 'in_progress') return t.brand;
  return t.ink4;
}

function MilestoneRow({ milestone, last }: { milestone: GoalMilestone; last?: boolean }) {
  const t = useTheme();
  const tone = statusColor(milestone.status, t);
  const fillWidth = `${Math.round(milestone.progress * 100)}%` as DimensionValue;

  return (
    <View style={[styles.progressRow, { borderBottomColor: t.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      <View style={[styles.progressIcon, { backgroundColor: milestone.status === 'locked' ? t.bgElev : tone + '18', borderRadius: t.radius.sm }]}>
        {milestone.status === 'locked' ? <IconLock size={18} color={tone} /> : iconForMilestone(milestone.icon, tone)}
      </View>
      <View style={styles.progressCopy}>
        <View style={styles.rowHeader}>
          <Text style={[typography.bodyMed, { color: t.ink, flex: 1 }]}>{milestone.title}</Text>
          <Text style={[typography.micro, styles.upperLabel, { color: tone }]}>{milestone.status.replace('_', ' ')}</Text>
        </View>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{milestone.description}</Text>
        <View style={[styles.progBarTrack, { backgroundColor: t.border, borderRadius: t.radius.pill, marginTop: 8 }]}>
          <View style={[styles.progBarFill, { backgroundColor: tone, borderRadius: t.radius.pill, width: fillWidth }]} />
        </View>
      </View>
    </View>
  );
}

export function GoalMilestonesScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);
  const target = goal.data?.target_weight_kg ?? null;
  const loadProgress = useCallback(() => healthGoalService.progress({
    metric: 'weight_kg',
    target: target ?? 1,
    period: '30d',
  }), [target]);
  const progress = useApiQuery(
    queryKeys.healthGoalProgress('weight_kg', '30d'),
    loadProgress,
    { enabled: Boolean(target) },
  );

  if (goal.isLoading || progress.isLoading) {
    return (
      <Screen>
        <ApiState title={i18n('insights.loadingMilestones')} loading />
      </Screen>
    );
  }

  if (goal.error || progress.error) {
    return (
      <Screen>
        <ApiState
          title={i18n('insights.milestonesUnavailable')}
          message={goal.error?.message ?? progress.error?.message}
          actionLabel={i18n('common.retry')}
          onAction={() => { void goal.reload(); void progress.reload(); }}
        />
      </Screen>
    );
  }

  if (!goal.data || !target) {
    return (
      <Screen>
        <ApiState
          title={i18n('insights.noGoalConfigured')}
          message={i18n('insights.noGoalMessage')}
          actionLabel={i18n('insights.createGoal')}
          onAction={() => router.push('/insights/goals/create' as never)}
        />
      </Screen>
    );
  }

  const milestones = deriveGoalMilestones(goal.data, progress.data ?? []);
  const summary = summarizeGoalMilestones(milestones);
  const earned = milestones.filter((item) => item.status === 'earned');
  const inProgress = milestones.filter((item) => item.status === 'in_progress');

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backBar}>
        <ChevronLeft size={20} color={t.ink} />
        <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>{i18n('insights.milestones')}</Text>
      </Pressable>

      <Card style={styles.statStrip}>
        {[
          { label: 'EARNED', value: summary.earned },
          { label: 'IN PROGRESS', value: summary.inProgress },
          { label: 'LOCKED', value: summary.locked },
        ].map((cell, index) => (
          <React.Fragment key={cell.label}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
            <View style={styles.statCell}>
              <Text style={[typography.h3, { color: t.ink }]}>{cell.value}</Text>
              <Text style={[typography.micro, styles.upperLabel, { color: t.ink3, marginTop: 2 }]}>
                {cell.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </Card>

      <SectionHeader title={i18n('insights.justEarned')} />
      {earned.length > 0 ? (
        <Card tight>
          {earned.map((milestone, index) => (
            <MilestoneRow key={milestone.id} milestone={milestone} last={index === earned.length - 1} />
          ))}
        </Card>
      ) : (
        <ApiState title="No earned milestones yet" message="Log Core weight readings to unlock progress milestones." />
      )}

      <SectionHeader title={i18n('insights.inProgress')} />
      {inProgress.length > 0 ? (
        <Card tight>
          {inProgress.map((milestone, index) => (
            <MilestoneRow key={milestone.id} milestone={milestone} last={index === inProgress.length - 1} />
          ))}
        </Card>
      ) : (
        <ApiState title="No milestones in progress" message="All available milestones are either earned or locked." />
      )}

      <SectionHeader title={i18n('insights.allMilestones')} />
      <Card tight>
        {milestones.map((milestone, index) => (
          <MilestoneRow key={milestone.id} milestone={milestone} last={index === milestones.length - 1} />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  statStrip: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 8 },
  statCell: { flex: 1, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  upperLabel: { textTransform: 'uppercase' },
  progressRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  progressIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  progressCopy: { flex: 1, marginLeft: 12 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progBarTrack: { height: 5, width: '100%' },
  progBarFill: { height: 5 },
});
