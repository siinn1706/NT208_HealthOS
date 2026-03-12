/**
 * Gamification server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * First attempts BFF call, falls back to mock data when unavailable.
 *
 * BFF TODO (stubs needed):
 * - GET /api/v1/goals → getActiveGoals()
 * - GET /api/v1/milestones → getAllMilestones()
 * - GET /api/v1/milestones/:activity → getMilestonesByActivity()
 * - GET /api/v1/streaks → getUserStreakHistory()
 * - GET /api/v1/bmi-progress → getUserBmiData()
 * - GET /api/v1/leaderboard → getLeaderboard()
 * - GET /api/v1/gamification-summary → getGamificationSummary()
 * - GET /api/v1/milestones/grouped → getMilestonesGrouped()
 */

import {
  MOCK_ACTIVE_GOALS,
  MOCK_ALL_MILESTONES,
  MOCK_BMI_DATA,
  MOCK_LEADERBOARD,
  MOCK_STREAK_HISTORY,
  type ActivityMilestone,
  type ActivityType,
  type GamificationSummary,
  type LeaderboardEntry,
  type UserBmiData,
  type UserGoal,
  type UserStreakEntry,
} from "@/data/gamification";

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
  return MOCK_ACTIVE_GOALS;
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
  return MOCK_STREAK_HISTORY;
}

export async function getUserBmiData(): Promise<UserBmiData> {
  return MOCK_BMI_DATA;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return MOCK_LEADERBOARD;
}

/** Full summary for the Goals hub page. */
export async function getGamificationSummary(): Promise<GamificationSummary> {
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
