import {
  buildGoalProgressCells,
  deriveGoalMilestones,
  deriveGoalStreakSummary,
  summarizeGoalMilestones,
} from '../components/insights/goals/goal-progress-derived';
import type { HealthGoal } from '../../../shared/api-contracts';

const goal: HealthGoal = {
  id: 'goal-1',
  user_id: 'user-1',
  target_weight_kg: 70,
  deadline: null,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-31T00:00:00.000Z',
};

const progress = [
  { date: '2026-05-27', value: 72, target: 70, progress_percent: 102.8 },
  { date: '2026-05-29', value: 71, target: 70, progress_percent: 101.4 },
  { date: '2026-05-30', value: 70.5, target: 70, progress_percent: 100.7 },
  { date: '2026-05-31', value: 69.8, target: 70, progress_percent: 99.7 },
];

describe('goal progress derivation', () => {
  it('builds recorded and target heatmap cells from Core progress points', () => {
    const cells = buildGoalProgressCells(progress, 5, '2026-05-31');

    expect(cells.map((cell) => [cell.date, cell.state])).toEqual([
      ['2026-05-27', 'recorded'],
      ['2026-05-28', 'empty'],
      ['2026-05-29', 'recorded'],
      ['2026-05-30', 'recorded'],
      ['2026-05-31', 'target'],
    ]);
  });

  it('aligns full-week heatmap windows to Monday labels', () => {
    const cells = buildGoalProgressCells(progress, 35, '2026-05-27');

    expect(cells[0].date).toBe('2026-04-27');
    expect(cells[34].date).toBe('2026-05-31');
  });

  it('derives streaks and milestones without a separate milestone API', () => {
    const streak = deriveGoalStreakSummary(progress, '2026-05-31');
    const milestones = deriveGoalMilestones(goal, progress, '2026-05-31');
    const summary = summarizeGoalMilestones(milestones);

    expect(streak).toMatchObject({
      recordedDays: 4,
      currentStreak: 3,
      bestStreak: 3,
      targetHitDays: 1,
      latestValue: 69.8,
      latestDate: '2026-05-31',
    });
    expect(milestones.map((item) => [item.id, item.status])).toEqual([
      ['goal-created', 'earned'],
      ['first-weigh-in', 'earned'],
      ['three-day-streak', 'earned'],
      ['seven-day-streak', 'in_progress'],
      ['target-reached', 'earned'],
    ]);
    expect(summary).toEqual({ earned: 4, inProgress: 1, locked: 0 });
  });
});
