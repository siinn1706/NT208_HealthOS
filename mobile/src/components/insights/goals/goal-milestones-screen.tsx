import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../layout/screen';
import { Card } from '../../primitives/card';
import { SectionHeader } from '../../layout/section-header';
import { ApiState, MissingApiState } from '../../api/api-state';
import { useApiQuery } from '../../../api/query';
import { queryKeys } from '../../../api/queryKeys';
import { healthGoalService } from '../../../api/services';
import { useTheme } from '../../../theme/useTheme';
import { typography } from '../../../theme/typography';
import { ChevronLeft } from '../../../icons';

const STAT_CELLS = [
  { label: 'EARNED',      value: '--' },
  { label: 'IN PROGRESS', value: '--' },
  { label: 'LOCKED',      value: '--' },
];

export function GoalMilestonesScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const loadGoal = useCallback(() => healthGoalService.current(), []);
  const goal = useApiQuery(queryKeys.healthGoal, loadGoal);

  if (goal.isLoading) {
    return (
      <Screen>
        <ApiState title={i18n('insights.loadingMilestones')} loading />
      </Screen>
    );
  }

  if (goal.error) {
    return (
      <Screen>
        <ApiState title={i18n('insights.milestonesUnavailable')} message={goal.error.message} actionLabel={i18n('common.retry')} onAction={goal.reload} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backBar}>
        <ChevronLeft size={20} color={t.ink} />
        <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>{i18n('insights.milestones')}</Text>
      </Pressable>

      {/* Top stat strip: Earned / In Progress / Locked */}
      <Card style={styles.statStrip}>
        {STAT_CELLS.map((cell, i) => (
          <React.Fragment key={cell.label}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
            <View style={styles.statCell}>
              <Text style={[typography.h3, { color: t.ink }]}>{cell.value}</Text>
              <Text style={[typography.micro, { color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }]}>
                {cell.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </Card>

      {/* Just earned */}
      <SectionHeader title={i18n('insights.justEarned')} />
      <View style={[styles.earnedCard, { backgroundColor: t.successSoft, borderRadius: t.radius.xl }]}>
        <View style={[styles.badgeIcon, { backgroundColor: t.success + '22', borderRadius: t.radius.md }]}>
          <Text style={{ fontSize: 24 }}>🏅</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[typography.micro, { color: t.success, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
            Earned
          </Text>
          <Text style={[typography.title, { color: t.ink, marginTop: 2 }]}>Walking warrior</Text>
          <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>50,000 steps in a week</Text>
        </View>
        {/* TODO(api): GET /v1/health-goals/{id}/milestones — earned section */}
      </View>
      <MissingApiState title="Earned milestones unavailable" contract="TODO: GET /v1/health-goals/{id}/milestones" />

      {/* In progress */}
      <SectionHeader title={i18n('insights.inProgress')} />
      <Card tight>
        {[
          { emoji: '🚶', title: 'Step master',     sub: '7,500 / 10,000 steps/day for 7 d' },
          { emoji: '😴', title: 'Sleep champion',  sub: '5 / 7 nights ≥ 8 h'             },
          { emoji: '💊', title: 'Pill streak',     sub: '12 / 30 days on time'            },
        ].map((row, i) => (
          <View
            key={i}
            style={[
              styles.progressRow,
              { borderBottomColor: t.border, borderBottomWidth: i < 2 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <View style={[styles.progressIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
              <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{row.title}</Text>
              <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>{row.sub}</Text>
              {/* Progress bar placeholder */}
              <View style={[styles.progBarTrack, { backgroundColor: t.border, borderRadius: t.radius.pill, marginTop: 6 }]}>
                <View style={[styles.progBarFill, { backgroundColor: t.brand, borderRadius: t.radius.pill, width: '40%' }]} />
              </View>
            </View>
          </View>
        ))}
        {/* TODO(api): GET /v1/health-goals/{id}/milestones/progress */}
        <MissingApiState title="Milestone progress unavailable" contract="TODO: GET /v1/health-goals/{id}/milestones/progress" />
      </Card>

      {/* All milestones badge grid */}
      <SectionHeader title={i18n('insights.allMilestones')} />
      <Card style={styles.badgeGrid}>
        {['🏅', '🌟', '🔥', '💪', '🎯', '🏃'].map((em, i) => (
          <View
            key={i}
            style={[styles.badgeCell, { backgroundColor: t.bgElev, borderRadius: t.radius.md }]}
          >
            <Text style={{ fontSize: 28 }}>{em}</Text>
          </View>
        ))}
        {/* TODO(api): GET /v1/health-goals/{id}/milestones — full badge grid */}
        <MissingApiState title="All milestones unavailable" contract="TODO: GET /v1/health-goals/{id}/milestones" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBar:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  statStrip:    { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 8 },
  statCell:     { flex: 1, alignItems: 'center' },
  divider:      { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  earnedCard:   { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 4 },
  badgeIcon:    { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  progressRow:  { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  progressIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  progBarTrack: { height: 5, width: '100%' },
  progBarFill:  { height: 5 },
  badgeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  badgeCell:    { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
});
