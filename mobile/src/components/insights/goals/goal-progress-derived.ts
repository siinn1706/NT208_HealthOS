import type { HealthGoal } from '../../../../../shared/api-contracts';
import type { GoalProgressPoint } from '../../../api/services/health-goal-service';

const DAY_MS = 24 * 60 * 60 * 1000;

export type GoalCellState = 'empty' | 'recorded' | 'target';
export type GoalMilestoneStatus = 'earned' | 'in_progress' | 'locked';
export type GoalMilestoneIcon = 'target' | 'activity' | 'fire' | 'badge';

export interface GoalProgressCell {
  date: string;
  state: GoalCellState;
  value: number | null;
  progressPercent: number | null;
}

export interface GoalStreakSummary {
  recordedDays: number;
  currentStreak: number;
  bestStreak: number;
  targetHitDays: number;
  latestValue: number | null;
  latestDate: string | null;
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  status: GoalMilestoneStatus;
  progress: number;
  icon: GoalMilestoneIcon;
}

function toDateKey(value: Date | string) {
  if (typeof value === 'string') return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

function weekAlignedStartKey(todayKey: string, days: number) {
  if (days % 7 !== 0) return shiftDateKey(todayKey, -(days - 1));
  const [year, month, day] = todayKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;
  const currentWeekMonday = shiftDateKey(todayKey, -daysSinceMonday);
  return shiftDateKey(currentWeekMonday, -(days - 7));
}

function sortedUniqueDateKeys(points: GoalProgressPoint[], today: Date | string) {
  const todayKey = toDateKey(today);
  return Array.from(new Set(points.map((point) => point.date.slice(0, 10))))
    .filter((date) => date <= todayKey)
    .sort();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function statusFromProgress(progress: number): GoalMilestoneStatus {
  if (progress >= 1) return 'earned';
  if (progress > 0) return 'in_progress';
  return 'locked';
}

export function buildGoalProgressCells(points: GoalProgressPoint[], days = 35, today: Date | string = new Date()): GoalProgressCell[] {
  const todayKey = toDateKey(today);
  const startKey = weekAlignedStartKey(todayKey, days);
  const pointsByDate = new Map(points.map((point) => [point.date.slice(0, 10), point]));

  return Array.from({ length: days }, (_, index) => {
    const date = shiftDateKey(startKey, index);
    const point = pointsByDate.get(date);
    if (!point) {
      return { date, state: 'empty', value: null, progressPercent: null };
    }
    return {
      date,
      state: point.value <= point.target ? 'target' : 'recorded',
      value: point.value,
      progressPercent: point.progress_percent,
    };
  });
}

export function deriveGoalStreakSummary(points: GoalProgressPoint[], today: Date | string = new Date()): GoalStreakSummary {
  const dates = sortedUniqueDateKeys(points, today);
  const latestDate = dates.at(-1) ?? null;
  const latestPoint = latestDate ? points.find((point) => point.date.slice(0, 10) === latestDate) ?? null : null;
  const targetHitDays = points.filter((point) => point.value <= point.target).length;

  let bestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  dates.forEach((date) => {
    run = previous && shiftDateKey(previous, 1) === date ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = date;
  });

  let currentStreak = 0;
  let cursor = latestDate;
  const dateSet = new Set(dates);
  while (cursor && dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return {
    recordedDays: dates.length,
    currentStreak,
    bestStreak,
    targetHitDays,
    latestValue: latestPoint?.value ?? null,
    latestDate,
  };
}

export function deriveGoalMilestones(goal: HealthGoal | null, points: GoalProgressPoint[], today: Date | string = new Date()): GoalMilestone[] {
  if (!goal) return [];
  const summary = deriveGoalStreakSummary(points, today);
  const latest = summary.latestValue;
  const target = goal.target_weight_kg ?? 0;
  const targetProgress = latest && target ? (latest <= target ? 1 : target / latest) : 0;

  return [
    {
      id: 'goal-created',
      title: 'Target created',
      description: `Target weight ${target.toFixed(1)} kg is saved in Core.`,
      status: 'earned',
      progress: 1,
      icon: 'target',
    },
    {
      id: 'first-weigh-in',
      title: 'First weight check-in',
      description: summary.recordedDays > 0 ? `${summary.recordedDays} Core weight sample(s) found.` : 'Log one weight reading to start progress tracking.',
      status: statusFromProgress(summary.recordedDays > 0 ? 1 : 0),
      progress: summary.recordedDays > 0 ? 1 : 0,
      icon: 'activity',
    },
    {
      id: 'three-day-streak',
      title: 'Three-day tracking streak',
      description: `${Math.min(summary.bestStreak, 3)} / 3 consecutive recorded days.`,
      status: statusFromProgress(clamp01(summary.bestStreak / 3)),
      progress: clamp01(summary.bestStreak / 3),
      icon: 'fire',
    },
    {
      id: 'seven-day-streak',
      title: 'Seven-day tracking streak',
      description: `${Math.min(summary.bestStreak, 7)} / 7 consecutive recorded days.`,
      status: summary.bestStreak >= 7 ? 'earned' : summary.bestStreak >= 3 ? 'in_progress' : 'locked',
      progress: clamp01(summary.bestStreak / 7),
      icon: 'fire',
    },
    {
      id: 'target-reached',
      title: 'Target reached',
      description: summary.targetHitDays > 0 ? `${summary.targetHitDays} day(s) at or below target.` : latest ? `Latest ${latest.toFixed(1)} kg vs target ${target.toFixed(1)} kg.` : 'Needs a Core weight sample.',
      status: statusFromProgress(clamp01(targetProgress)),
      progress: clamp01(targetProgress),
      icon: 'badge',
    },
  ];
}

export function summarizeGoalMilestones(milestones: GoalMilestone[]) {
  return {
    earned: milestones.filter((item) => item.status === 'earned').length,
    inProgress: milestones.filter((item) => item.status === 'in_progress').length,
    locked: milestones.filter((item) => item.status === 'locked').length,
  };
}
