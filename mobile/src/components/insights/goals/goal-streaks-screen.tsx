import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { ChevronLeft, IconFire, IconTarget } from '../../../icons';
import { buildGoalProgressCells, deriveGoalStreakSummary, type GoalCellState } from './goal-progress-derived';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5'];

function cellColor(state: GoalCellState, t: ReturnType<typeof useTheme>) {
  if (state === 'target') return t.success;
  if (state === 'recorded') return t.brand;
  return t.bgElev;
}

export function GoalStreaksScreen() {
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
        <ApiState title={i18n('insights.loadingStreaks')} loading />
      </Screen>
    );
  }

  if (goal.error || progress.error) {
    return (
      <Screen>
        <ApiState
          title={i18n('insights.streaksUnavailable')}
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

  const cells = buildGoalProgressCells(progress.data ?? [], 35);
  const weeks = Array.from({ length: 5 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const summary = deriveGoalStreakSummary(progress.data ?? []);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backBar}>
        <ChevronLeft size={20} color={t.ink} />
        <Text style={[typography.bodyMed, { color: t.ink, marginLeft: 4 }]}>{i18n('insights.streaks')}</Text>
      </Pressable>

      <LinearGradient
        colors={[t.warningSoft, t.successSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: t.radius.xl }]}
      >
        <View style={[styles.heroIcon, { backgroundColor: t.bgElev, borderRadius: t.radius.lg }]}>
          <IconFire size={34} color={t.warning} />
        </View>
        <Text style={[styles.streakCount, { color: t.ink }]}>{summary.currentStreak}</Text>
        <Text style={[typography.micro, styles.upperLabel, { color: t.ink2 }]}>RECORDED DAY STREAK</Text>
        <Text style={[typography.caption, { color: t.ink3, marginTop: 6 }]}>
          Best ever {summary.bestStreak} d · {summary.recordedDays} recorded days
        </Text>
      </LinearGradient>

      <SectionHeader title={i18n('insights.last5Weeks')} />
      <Card style={styles.heatmapCard}>
        <View style={styles.heatmapHeader}>
          <View style={styles.weekLabelCell} />
          {DAY_LABELS.map((day, index) => (
            <View key={`${day}-${index}`} style={styles.heatCell}>
              <Text style={[typography.micro, { color: t.ink3 }]}>{day}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={WEEK_LABELS[weekIndex]} style={styles.heatRow}>
            <View style={styles.weekLabelCell}>
              <Text style={[typography.micro, { color: t.ink4 }]}>{WEEK_LABELS[weekIndex]}</Text>
            </View>
            {week.map((cell) => (
              <View
                key={cell.date}
                accessibilityLabel={`${cell.date} ${cell.state}`}
                style={[
                  styles.heatCell,
                  {
                    backgroundColor: cellColor(cell.state, t),
                    borderRadius: 6,
                    borderColor: cell.state === 'empty' ? t.border : 'transparent',
                    borderWidth: cell.state === 'empty' ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              />
            ))}
          </View>
        ))}

        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: t.bgElev, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth }]} />
          <Text style={[typography.micro, { color: t.ink4 }]}>Empty</Text>
          <View style={[styles.legendDot, { backgroundColor: t.brand }]} />
          <Text style={[typography.micro, { color: t.ink4 }]}>Logged</Text>
          <View style={[styles.legendDot, { backgroundColor: t.success }]} />
          <Text style={[typography.micro, { color: t.ink4 }]}>At target</Text>
        </View>
      </Card>

      <SectionHeader title={i18n('insights.byGoal')} />
      <Card tight>
        <View style={styles.goalRow}>
          <View style={[styles.goalIcon, { backgroundColor: t.brandSoft, borderRadius: t.radius.sm }]}>
            <IconTarget size={18} color={t.brand} />
          </View>
          <View style={styles.goalCopy}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>Target weight {target.toFixed(1)} kg</Text>
            <Text style={[typography.caption, { color: t.ink3, marginTop: 2 }]}>
              {summary.targetHitDays} at-target days · latest {summary.latestValue !== null ? `${summary.latestValue.toFixed(1)} kg` : 'not logged'}
            </Text>
          </View>
          <View style={[styles.fireBadge, { backgroundColor: t.warningSoft, borderRadius: t.radius.pill }]}>
            <IconFire size={12} color={t.warning} />
            <Text style={[typography.chip, { color: t.warning, marginLeft: 3 }]}>{summary.currentStreak} d</Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const CELL_SIZE = 32;
const CELL_GAP = 4;

const styles = StyleSheet.create({
  backBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  hero: { padding: 24, alignItems: 'center', marginTop: 4, marginBottom: 4 },
  heroIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  streakCount: { fontSize: 64, fontWeight: '800', lineHeight: 72 },
  upperLabel: { textTransform: 'uppercase' },
  heatmapCard: { padding: 14 },
  heatmapHeader: { flexDirection: 'row', marginBottom: 4 },
  heatRow: { flexDirection: 'row', marginBottom: CELL_GAP },
  weekLabelCell: { width: 24, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 },
  heatCell: { width: CELL_SIZE, height: CELL_SIZE, marginLeft: CELL_GAP, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  goalIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  goalCopy: { flex: 1 },
  fireBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
});
