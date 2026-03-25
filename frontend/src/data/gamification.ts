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
  /** Human-readable label, e.g. "Chạy 300m mỗi ngày" */
  label: string;
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
  label: string;
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
  heightCm: number;
  weightKg: number;
  bmi: number;
  status: "underweight" | "normal" | "overweight" | "obese";
  /** 0-100: contributes to total ranking score */
  bmiScore: number;
  targetBmi: number;
  targetWeightKg: number;
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
    globalRank: number;
    currentStreak: number;
    longestStreak: number;
    unlockedAchievements: number;
    totalAchievements: number;
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
    label: "Chạy bộ mỗi ngày",
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
    label: "Số bước chân mỗi ngày",
    dailyTarget: 8000,
    unit: "bước",
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
    label: "Chạy 100m mỗi ngày",
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
    label: "Chạy 200m mỗi ngày",
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
    label: "Chạy 300m mỗi ngày",
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
    label: "Chạy 400m mỗi ngày",
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
    label: "Chạy 500m mỗi ngày",
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
    label: "5.000 bước mỗi ngày",
    targetValue: 5000,
    unit: "bước",
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
    label: "7.000 bước mỗi ngày",
    targetValue: 7000,
    unit: "bước",
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
    label: "8.000 bước mỗi ngày",
    targetValue: 8000,
    unit: "bước",
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
    label: "10.000 bước mỗi ngày",
    targetValue: 10000,
    unit: "bước",
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
    label: "15.000 bước mỗi ngày",
    targetValue: 15000,
    unit: "bước",
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
    label: "Đạp xe 5km mỗi ngày",
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
    label: "Đạp xe 10km mỗi ngày",
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
    label: "Đạp xe 15km mỗi ngày",
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
    label: "Đạp xe 20km mỗi ngày",
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
    label: "Đạp xe 25km mỗi ngày",
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
    label: "Bơi 100m mỗi ngày",
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
    label: "Bơi 200m mỗi ngày",
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
    label: "Bơi 400m mỗi ngày",
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
    label: "Bơi 500m mỗi ngày",
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
    label: "Bơi 1km mỗi ngày",
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

// ── Leaderboard ───────────────────────────────────────────────
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: "u-02",
    displayName: "Trần Minh Khôi",
    avatarInitial: "K",
    avatarColor: "#1965B3",
    totalScore: 1480,
    achievementsCount: 11,
    currentStreak: 28,
    bmiScore: 90,
    weeklyChange: 0,
  },
  {
    rank: 2,
    userId: "u-03",
    displayName: "Lê Hồng Nhung",
    avatarInitial: "N",
    avatarColor: "#9333EA",
    totalScore: 1320,
    achievementsCount: 9,
    currentStreak: 21,
    bmiScore: 85,
    weeklyChange: +1,
  },
  {
    rank: 3,
    userId: "u-04",
    displayName: "Phạm Quốc Hùng",
    avatarInitial: "H",
    avatarColor: "#D97706",
    totalScore: 1185,
    achievementsCount: 8,
    currentStreak: 18,
    bmiScore: 78,
    weeklyChange: -1,
  },
  {
    rank: 4,
    userId: "u-01",
    displayName: "Nguyễn Văn A",
    avatarInitial: "A",
    avatarColor: "#16A34A",
    totalScore: 1072,
    achievementsCount: 7,
    currentStreak: 15,
    bmiScore: 72,
    weeklyChange: +2,
    isCurrentUser: true,
  },
  {
    rank: 5,
    userId: "u-05",
    displayName: "Đinh Thị Lan",
    avatarInitial: "L",
    avatarColor: "#DC2626",
    totalScore: 960,
    achievementsCount: 6,
    currentStreak: 12,
    bmiScore: 80,
    weeklyChange: 0,
  },
  {
    rank: 6,
    userId: "u-06",
    displayName: "Võ Thành Đạt",
    avatarInitial: "Đ",
    avatarColor: "#0891B2",
    totalScore: 840,
    achievementsCount: 5,
    currentStreak: 9,
    bmiScore: 65,
    weeklyChange: -2,
  },
  {
    rank: 7,
    userId: "u-07",
    displayName: "Bùi Khánh Linh",
    avatarInitial: "L",
    avatarColor: "#BE185D",
    totalScore: 720,
    achievementsCount: 4,
    currentStreak: 7,
    bmiScore: 70,
    weeklyChange: +1,
  },
  {
    rank: 8,
    userId: "u-08",
    displayName: "Ngô Đức Hải",
    avatarInitial: "H",
    avatarColor: "#7C3AED",
    totalScore: 590,
    achievementsCount: 3,
    currentStreak: 5,
    bmiScore: 55,
    weeklyChange: 0,
  },
  {
    rank: 9,
    userId: "u-09",
    displayName: "Phan Thị Thu",
    avatarInitial: "T",
    avatarColor: "#F59E0B",
    totalScore: 460,
    achievementsCount: 2,
    currentStreak: 4,
    bmiScore: 60,
    weeklyChange: +3,
  },
  {
    rank: 10,
    userId: "u-10",
    displayName: "Hoàng Minh Trí",
    avatarInitial: "T",
    avatarColor: "#10B981",
    totalScore: 310,
    achievementsCount: 1,
    currentStreak: 3,
    bmiScore: 45,
    weeklyChange: -1,
  },
];

// ── Possible milestones per activity (for Goal Wizard) ────────
export const ACTIVITY_CONFIG: Record<
  ActivityType,
  { emoji: string; labelVi: string; milestones: { value: number; unit: string }[] }
> = {
  running: {
    emoji: "🏃",
    labelVi: "Chạy bộ",
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
    labelVi: "Đạp xe",
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
    labelVi: "Bơi lội",
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
    labelVi: "Bước chân",
    milestones: [
      { value: 5000, unit: "bước" },
      { value: 7000, unit: "bước" },
      { value: 8000, unit: "bước" },
      { value: 10000, unit: "bước" },
      { value: 15000, unit: "bước" },
    ],
  },
};
