/**
 * Gamification & Goal Tracking — Static mock data & type definitions.
 * In V1, replace mock returns with fetch() calls to Core BE via BFF route handlers.
 */

// ─────────────────────────── Types ───────────────────────────

export type ActivityType =
  | "running"
  | "cycling"
  | "swimming"
  | "steps";

export type AchievementStatus = "locked" | "in-progress" | "unlocked";
export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

/** One specific milestone for a given activity (e.g., Run 300m/day). */
export interface ActivityMilestone {
  id: string;
  activityType: ActivityType;
  /** Translation key under dashboard.goals.milestoneLabels and dashboard.achievements.milestoneLabels */
  labelKey: string;
  targetValue: number;
  unit: string;
  /** Points awarded on unlock */
  pointValue: number;
  tier: AchievementTier;
  /** Current tracking towards unlock (5 days/week × 4 weeks = 20 qualifying days) */
  currentWeek: 1 | 2 | 3 | 4;
  daysThisWeek: number; // 0-5
  totalDaysCompleted: number; // 0-20
  status: AchievementStatus;
  unlockedAt?: string; // ISO date string
}

/** An active goal the user is currently working towards each day. */
export interface UserGoal {
  id: string;
  activityType: ActivityType;
  /** Translation key under dashboard.goals.milestoneLabels and dashboard.achievements.milestoneLabels */
  labelKey: string;
  dailyTarget: number;
  unit: string;
  todayProgress: number;
  isActive: boolean;
  /** Hex colour used for progress ring / bar */
  color: string;
  createdAt: string;
}

/** A single day entry for streak heatmap (last 8 weeks). */
export interface UserStreakEntry {
  date: string; // YYYY-MM-DD
  completed: boolean;
  activitiesCount: number; // how many goals met that day
}

/** One row in the global leaderboard. */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarInitial: string;
  avatarColor: string;
  totalScore: number;
  achievementsCount: number;
  currentStreak: number;
  bmiScore: number;
  weeklyChange: number; // +/- rank change this week
  isCurrentUser?: boolean;
}

/** BMI statistics with ranking contribution. */
export interface UserBmiData {
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  status: "underweight" | "normal" | "overweight" | "obese";
  /** 0-100: contributes to total ranking score */
  bmiScore: number | null;
  targetBmi: number | null;
  targetWeightKg: number | null;
  /** ISO date string, null if no deadline set */
  deadline: string | null;
  /** null if no goal saved yet */
  goalId: string | null;
}

/** Top-level summary for the Goals hub page. */
export interface GamificationSummary {
  currentUser: {
    displayName: string;
    totalScore: number;
    /** null when leaderboard rank has not yet been computed for this user. */
    globalRank: number | null;
    currentStreak: number;
    longestStreak: number;
    unlockedAchievements: number;
    /** null when the milestone catalog has not yet been wired up server-side. */
    totalAchievements: number | null;
  };
  bmi: UserBmiData;
  activeGoals: UserGoal[];
  streakHistory: UserStreakEntry[];
  recentUnlocked: ActivityMilestone[];
}

// ─────────────────────────── Mock Data ───────────────────────────

/** Generates YYYY-MM-DD for `daysAgo` days back from today */
function daysAgo(n: number): string {
  const d = new Date(2026, 2, 3); // March 3 2026 (current date)
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Active goals ──────────────────────────────────────────────
export const MOCK_ACTIVE_GOALS: UserGoal[] = [
  {
    id: "goal-running",
    activityType: "running",
    labelKey: "run-300",
    dailyTarget: 300,
    unit: "m",
    todayProgress: 250,
    isActive: true,
    color: "#41BCE6",
    createdAt: daysAgo(45),
  },
  {
    id: "goal-steps",
    activityType: "steps",
    labelKey: "steps-8000",
    dailyTarget: 8000,
    unit: "steps",
    todayProgress: 5600,
    isActive: true,
    color: "#E3B79A",
    createdAt: daysAgo(60),
  },
];

// ── All achievement milestones ────────────────────────────────
export const MOCK_ALL_MILESTONES: ActivityMilestone[] = [
  // ────── Running ──────
  {
    id: "run-100",
    activityType: "running",
    labelKey: "run-100",
    targetValue: 100,
    unit: "m",
    pointValue: 100,
    tier: "bronze",
    currentWeek: 4,
    daysThisWeek: 5,
    totalDaysCompleted: 20,
    status: "unlocked",
    unlockedAt: daysAgo(60),
  },
  {
    id: "run-200",
    activityType: "running",
    labelKey: "run-200",
    targetValue: 200,
    unit: "m",
    pointValue: 200,
    tier: "silver",
    currentWeek: 4,
    daysThisWeek: 5,
    totalDaysCompleted: 20,
    status: "unlocked",
    unlockedAt: daysAgo(35),
  },
  {
    id: "run-300",
    activityType: "running",
    labelKey: "run-300",
    targetValue: 300,
    unit: "m",
    pointValue: 300,
    tier: "gold",
    currentWeek: 3,
    daysThisWeek: 4,
    totalDaysCompleted: 14,
    status: "in-progress",
  },
  {
    id: "run-400",
    activityType: "running",
    labelKey: "run-400",
    targetValue: 400,
    unit: "m",
    pointValue: 400,
    tier: "platinum",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "run-500",
    activityType: "running",
    labelKey: "run-500",
    targetValue: 500,
    unit: "m",
    pointValue: 500,
    tier: "diamond",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },

  // ────── Steps ──────
  {
    id: "steps-5000",
    activityType: "steps",
    labelKey: "steps-5000",
    targetValue: 5000,
    unit: "steps",
    pointValue: 100,
    tier: "bronze",
    currentWeek: 4,
    daysThisWeek: 5,
    totalDaysCompleted: 20,
    status: "unlocked",
    unlockedAt: daysAgo(90),
  },
  {
    id: "steps-7000",
    activityType: "steps",
    labelKey: "steps-7000",
    targetValue: 7000,
    unit: "steps",
    pointValue: 200,
    tier: "silver",
    currentWeek: 4,
    daysThisWeek: 5,
    totalDaysCompleted: 20,
    status: "unlocked",
    unlockedAt: daysAgo(52),
  },
  {
    id: "steps-8000",
    activityType: "steps",
    labelKey: "steps-8000",
    targetValue: 8000,
    unit: "steps",
    pointValue: 250,
    tier: "gold",
    currentWeek: 1,
    daysThisWeek: 5,
    totalDaysCompleted: 5,
    status: "in-progress",
  },
  {
    id: "steps-10000",
    activityType: "steps",
    labelKey: "steps-10000",
    targetValue: 10000,
    unit: "steps",
    pointValue: 350,
    tier: "platinum",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "steps-15000",
    activityType: "steps",
    labelKey: "steps-15000",
    targetValue: 15000,
    unit: "steps",
    pointValue: 600,
    tier: "diamond",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },

  // ────── Cycling ──────
  {
    id: "cycle-5",
    activityType: "cycling",
    labelKey: "cycle-5",
    targetValue: 5,
    unit: "km",
    pointValue: 120,
    tier: "bronze",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "cycle-10",
    activityType: "cycling",
    labelKey: "cycle-10",
    targetValue: 10,
    unit: "km",
    pointValue: 250,
    tier: "silver",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "cycle-15",
    activityType: "cycling",
    labelKey: "cycle-15",
    targetValue: 15,
    unit: "km",
    pointValue: 400,
    tier: "gold",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "cycle-20",
    activityType: "cycling",
    labelKey: "cycle-20",
    targetValue: 20,
    unit: "km",
    pointValue: 600,
    tier: "platinum",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "cycle-25",
    activityType: "cycling",
    labelKey: "cycle-25",
    targetValue: 25,
    unit: "km",
    pointValue: 850,
    tier: "diamond",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },

  // ────── Swimming ──────
  {
    id: "swim-100",
    activityType: "swimming",
    labelKey: "swim-100",
    targetValue: 100,
    unit: "m",
    pointValue: 150,
    tier: "bronze",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "swim-200",
    activityType: "swimming",
    labelKey: "swim-200",
    targetValue: 200,
    unit: "m",
    pointValue: 300,
    tier: "silver",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "swim-400",
    activityType: "swimming",
    labelKey: "swim-400",
    targetValue: 400,
    unit: "m",
    pointValue: 500,
    tier: "gold",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "swim-500",
    activityType: "swimming",
    labelKey: "swim-500",
    targetValue: 500,
    unit: "m",
    pointValue: 700,
    tier: "platinum",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
  {
    id: "swim-1000",
    activityType: "swimming",
    labelKey: "swim-1000",
    targetValue: 1000,
    unit: "m",
    pointValue: 1000,
    tier: "diamond",
    currentWeek: 1,
    daysThisWeek: 0,
    totalDaysCompleted: 0,
    status: "locked",
  },
];

// ── Streak history (last 56 days = 8 weeks) ──────────────────
function buildStreakHistory(): UserStreakEntry[] {
  const pattern: (0 | 1 | 2 | 3 | 4)[] = [
    // week 8 (oldest)
    1, 1, 0, 1, 1, 0, 0,
    // week 7
    1, 1, 1, 1, 1, 0, 0,
    // week 6
    0, 1, 1, 1, 1, 0, 1,
    // week 5
    1, 1, 1, 0, 1, 1, 0,
    // week 4
    1, 1, 1, 1, 1, 0, 0,
    // week 3
    1, 1, 1, 1, 0, 1, 0,
    // week 2
    1, 1, 1, 1, 1, 0, 0,
    // week 1 (most recent, ends Mar 3 2026)
    1, 1, 1, 1, 1, 0, 1,
  ];
  return pattern.map((active, i) => ({
    date: daysAgo(55 - i),
    completed: active > 0,
    activitiesCount: active,
  }));
}

export const MOCK_STREAK_HISTORY: UserStreakEntry[] = buildStreakHistory();

// ── BMI data ──────────────────────────────────────────────────
export const MOCK_BMI_DATA: UserBmiData = {
  heightCm: 170,
  weightKg: 72,
  bmi: 24.9,
  status: "normal",
  bmiScore: 72, // contributes 72 pts to ranking score
  targetBmi: 22.0,
  targetWeightKg: 63.6,
  deadline: null,
  goalId: null,
};

// ── Possible milestones per activity (for Goal Wizard) ────────
export const ACTIVITY_CONFIG: Record<
  ActivityType,
  { emoji: string; labelKey: string; milestones: { value: number; unit: string }[] }
> = {
  running: {
    emoji: "🏃",
    labelKey: "running",
    milestones: [
      { value: 100, unit: "m" },
      { value: 200, unit: "m" },
      { value: 300, unit: "m" },
      { value: 400, unit: "m" },
      { value: 500, unit: "m" },
      { value: 1000, unit: "m" },
      { value: 2000, unit: "m" },
      { value: 5000, unit: "m" },
    ],
  },
  cycling: {
    emoji: "🚴",
    labelKey: "cycling",
    milestones: [
      { value: 5, unit: "km" },
      { value: 10, unit: "km" },
      { value: 15, unit: "km" },
      { value: 20, unit: "km" },
      { value: 25, unit: "km" },
    ],
  },
  swimming: {
    emoji: "🏊",
    labelKey: "swimming",
    milestones: [
      { value: 100, unit: "m" },
      { value: 200, unit: "m" },
      { value: 400, unit: "m" },
      { value: 500, unit: "m" },
      { value: 1000, unit: "m" },
    ],
  },
  steps: {
    emoji: "👟",
    labelKey: "steps",
    milestones: [
      { value: 5000, unit: "steps" },
      { value: 7000, unit: "steps" },
      { value: 8000, unit: "steps" },
      { value: 10000, unit: "steps" },
      { value: 15000, unit: "steps" },
    ],
  },
};
