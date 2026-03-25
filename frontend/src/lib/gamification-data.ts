/**
 * Gamification server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * First attempts BFF call, falls back to mock data when unavailable.
 */

import { headers } from "next/headers";
import {
  MOCK_ALL_MILESTONES,
  MOCK_LEADERBOARD,
  MOCK_BMI_DATA,
  MOCK_STREAK_HISTORY,
  MOCK_ACTIVE_GOALS,
  type ActivityMilestone,
  type ActivityType,
  type GamificationSummary,
  type LeaderboardEntry,
  type UserBmiData,
  type UserGoal,
  type UserStreakEntry,
} from "@/data/gamification";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function bffFetch(path: string): Promise<unknown> {
  const reqHeaders = await headers();
  const res = await fetch(`${APP_URL}${path}`, {
    cache: "no-store",
    headers: { cookie: reqHeaders.get("cookie") ?? "" },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// ─── Helpers ──────────────────────────────────────────────────

/** Compute current streak (consecutive completed days ending today). */
function computeCurrentStreak(history: UserStreakEntry[]): number {
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  let streak = 0;
  for (const entry of sorted) {
    if (entry.completed) streak++;
    else break;
  }
  return streak;
}

/** Compute longest streak in history. */
function computeLongestStreak(history: UserStreakEntry[]): number {
  let max = 0;
  let current = 0;
  for (const entry of history) {
    if (entry.completed) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

// ─── Public API ───────────────────────────────────────────────

export async function getActiveGoals(): Promise<UserGoal[]> {
  const json = await bffFetch("/api/v1/analytics/gamification-summary");
  if (!json) return MOCK_ACTIVE_GOALS;
  const data = json as { activeGoals?: UserGoal[] };
  return data.activeGoals ?? MOCK_ACTIVE_GOALS;
}

export async function getAllMilestones(): Promise<ActivityMilestone[]> {
  return MOCK_ALL_MILESTONES;
}

export async function getMilestonesByActivity(
  type: ActivityType
): Promise<ActivityMilestone[]> {
  return MOCK_ALL_MILESTONES.filter((m) => m.activityType === type);
}

export async function getUserStreakHistory(): Promise<UserStreakEntry[]> {
  const json = await bffFetch("/api/v1/analytics/gamification-summary");
  if (!json) return MOCK_STREAK_HISTORY;
  const data = json as { streakHistory?: UserStreakEntry[] };
  return data.streakHistory ?? MOCK_STREAK_HISTORY;
}

export async function getUserBmiData(): Promise<UserBmiData> {
  // Fetch health goal (user-set target) and gamification summary (weight/height) in parallel
  const [goalJson, summaryJson] = await Promise.all([
    bffFetch("/api/v1/health-goals"),
    bffFetch("/api/v1/analytics/gamification-summary"),
  ]);

  // Fall back to gamification-summary BMI if no goal saved
  if (summaryJson) {
    const summary = summaryJson as { bmi?: UserBmiData };
    const fallback = summary.bmi ?? MOCK_BMI_DATA;
    if (!goalJson) return fallback;

    const goal = (goalJson as { data?: HealthGoalBEData }).data;
    if (!goal) return fallback;

    // Merge: user-set target + current weight/height from gamification-summary
    const heightM = (goal.current_height_cm ?? fallback.heightCm) / 100;
    const currentBmi =
      fallback.weightKg > 0 && heightM > 0
        ? parseFloat((fallback.weightKg / heightM ** 2).toFixed(1))
        : fallback.bmi;

    // Derive target BMI: use goal's explicit target_bmi, or compute from target_weight_kg
    const derivedTargetBmi =
      goal.target_bmi ??
      (goal.target_weight_kg
        ? parseFloat(
            (
              goal.target_weight_kg /
              (goal.current_height_cm
                ? (goal.current_height_cm / 100) ** 2
                : heightM ** 2)
            ).toFixed(1)
          )
        : fallback.targetBmi);

    return {
      ...fallback,
      targetBmi: derivedTargetBmi,
      targetWeightKg: goal.target_weight_kg ?? fallback.targetWeightKg,
      heightCm: goal.current_height_cm ?? fallback.heightCm,
      bmi: currentBmi,
      deadline: goal.deadline ?? null,
      goalId: goal.id,
    };
  }

  return MOCK_BMI_DATA;
}

// Backend health-goal response shape
interface HealthGoalBEData {
  id: string;
  user_id: string;
  target_bmi: number | null;
  target_weight_kg: number | null;
  current_height_cm: number | null;
  deadline: string | null;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // TODO: Create GET /api/v1/leaderboard BFF route
  return MOCK_LEADERBOARD;
}

/** Full summary for the Goals hub page. */
export async function getGamificationSummary(): Promise<GamificationSummary> {
  const json = await bffFetch("/api/v1/analytics/gamification-summary");
  if (!json) {
    const [goals, milestones, history, bmi] = await Promise.all([
      getActiveGoals(),
      getAllMilestones(),
      getUserStreakHistory(),
      getUserBmiData(),
    ]);
    const currentStreak = computeCurrentStreak(history);
    const longestStreak = computeLongestStreak(history);
    const unlocked = milestones.filter((m) => m.status === "unlocked");
    const totalScore =
      unlocked.reduce((sum, m) => sum + m.pointValue, 0) +
      currentStreak * 10 +
      bmi.bmiScore;
    return {
      currentUser: {
        displayName: "Nguyễn Văn A",
        totalScore,
        globalRank: 4,
        currentStreak,
        longestStreak,
        unlockedAchievements: unlocked.length,
        totalAchievements: milestones.length,
      },
      bmi,
      activeGoals: goals,
      streakHistory: history,
      recentUnlocked: unlocked
        .filter((m) => m.unlockedAt)
        .sort(
          (a, b) =>
            new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
        )
        .slice(0, 3),
    };
  }

  const data = json as {
    currentUser?: GamificationSummary["currentUser"];
    bmi?: UserBmiData;
    activeGoals?: UserGoal[];
    streakHistory?: UserStreakEntry[];
    recentUnlocked?: ActivityMilestone[];
  };

  return {
    currentUser: data.currentUser ?? {
      displayName: "Nguyễn Văn A",
      totalScore: 1000,
      globalRank: 1,
      currentStreak: 0,
      longestStreak: 0,
      unlockedAchievements: 0,
      totalAchievements: 20,
    },
    bmi: data.bmi ?? MOCK_BMI_DATA,
    activeGoals: data.activeGoals ?? MOCK_ACTIVE_GOALS,
    streakHistory: data.streakHistory ?? MOCK_STREAK_HISTORY,
    recentUnlocked: data.recentUnlocked ?? [],
  };
}

/** Group milestones by activity type for Achievements page. */
export async function getMilestonesGrouped(): Promise<
  Record<ActivityType, ActivityMilestone[]>
> {
  const all = await getAllMilestones();
  const grouped: Partial<Record<ActivityType, ActivityMilestone[]>> = {};
  for (const m of all) {
    if (!grouped[m.activityType]) grouped[m.activityType] = [];
    grouped[m.activityType]!.push(m);
  }
  return grouped as Record<ActivityType, ActivityMilestone[]>;
}
