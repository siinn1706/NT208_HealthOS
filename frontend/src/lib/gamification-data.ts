/**
 * Gamification server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * First attempts BFF call, falls back to mock data when unavailable.
 */

import { headers } from "next/headers";
import {
  MOCK_ALL_MILESTONES,
  MOCK_LEADERBOARD,
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

/** Derive BMI status label from BMI value. */
function getBmiStatus(bmi: number): "underweight" | "normal" | "overweight" | "obese" {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

/** Fetch display name from session — used for fallbacks. */
async function getSessionDisplayName(): Promise<string> {
  const sessionJson = await bffFetch("/api/v1/auth/session");
  if (sessionJson && typeof sessionJson === "object" && "data" in sessionJson) {
    const data = sessionJson as { data?: { display_name?: unknown; username?: unknown; email?: unknown } };
    const session = data?.data;
    if (session && typeof session === "object") {
      const name = typeof session.display_name === "string" ? session.display_name.trim() : "";
      const user = typeof session.username === "string" ? session.username.trim() : "";
      const email = typeof session.email === "string" ? session.email.split("@")[0].trim() : "";
      return name || user || email || "";
    }
  }
  return "";
}

// ─── Public API ───────────────────────────────────────────────

export async function getActiveGoals(): Promise<UserGoal[]> {
  const json = await bffFetch("/api/v1/analytics/gamification-summary");
  const devFallback = process.env.NODE_ENV === "development" ? MOCK_ACTIVE_GOALS : [];
  if (!json) return devFallback;
  const data = json as { activeGoals?: UserGoal[] };
  return data.activeGoals ?? devFallback;
}

export async function getAllMilestones(): Promise<ActivityMilestone[]> {
  // TODO: connect to Core endpoint once /api/v1/analytics/milestones is implemented
  return MOCK_ALL_MILESTONES;
}

export async function getMilestonesByActivity(
  type: ActivityType
): Promise<ActivityMilestone[]> {
  // TODO: connect to Core endpoint once /api/v1/analytics/milestones is implemented
  return MOCK_ALL_MILESTONES.filter((m) => m.activityType === type);
}

export async function getUserStreakHistory(): Promise<UserStreakEntry[]> {
  const json = await bffFetch("/api/v1/analytics/gamification-summary");
  const devFallback = process.env.NODE_ENV === "development" ? MOCK_STREAK_HISTORY : [];
  if (!json) return devFallback;
  const data = json as { streakHistory?: UserStreakEntry[] };
  return data.streakHistory ?? devFallback;
}

export async function getUserBmiData(): Promise<UserBmiData> {
  // Always fetch from /api/v1/users/me (uncached) for height/weight — guarantees
  // profile and progress pages always show the same values.
  // Gamification-summary provides goal/streak/achievement data but its BMI fields
  // are Redis-cached and may lag behind a profile update.
  const [profileJson, goalJson] = await Promise.all([
    bffFetch("/api/v1/users/me"),
    bffFetch("/api/v1/health-goals"),
  ]);

  const profile = (profileJson as { data?: { height_cm?: number; weight_kg?: number } } | null)?.data ?? null;

  // Derive BMI from profile height/weight (always fresh, never cached)
  let bmi: number | null = null;
  let status: UserBmiData["status"] = "normal";
  if (profile?.height_cm && profile?.weight_kg && profile.height_cm > 0) {
    const hm = profile.height_cm / 100;
    bmi = parseFloat((profile.weight_kg / (hm * hm)).toFixed(1));
    status = getBmiStatus(bmi);
  }

  // Merge goal targets on top of profile current values
  const goal = goalJson && typeof goalJson === "object" && "data" in goalJson
    ? (goalJson as { data?: HealthGoalBEData }).data
    : null;

  let targetBmi: number | null = null;
  let targetWeightKg: number | null = null;
  let deadline: string | null = null;
  let goalId: string | null = null;

  if (goal?.target_weight_kg && profile?.height_cm && profile.height_cm > 0) {
    const hm = profile.height_cm / 100;
    targetBmi = parseFloat((goal.target_weight_kg / (hm * hm)).toFixed(1));
    targetWeightKg = goal.target_weight_kg;
    deadline = goal.deadline ?? null;
    goalId = goal.id;
  }

  if (bmi !== null) {
    return {
      heightCm: profile!.height_cm as number,
      weightKg: profile!.weight_kg as number,
      bmi,
      status,
      bmiScore: null,
      targetBmi,
      targetWeightKg,
      deadline,
      goalId,
    };
  }

  // Return null-structures — same null/empty pattern as getProfileData() so
  // /dashboard/profile and /dashboard/progress always show identical "no data"
  // states instead of hardcoded MOCK_BMI_DATA values.
  return {
    heightCm: null,
    weightKg: null,
    bmi: null,
    status: "normal" as const,
    bmiScore: null,
    targetBmi: null,
    targetWeightKg: null,
    deadline: null,
    goalId: null,
  };
}

// Backend health-goal response shape
interface HealthGoalBEData {
  id: string;
  user_id: string;
  target_weight_kg: number | null;
  deadline: string | null;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // TODO: Create GET /api/v1/leaderboard BFF route and connect to Core endpoint
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
      (bmi.bmiScore ?? 0);
    const displayName = await getSessionDisplayName();
    return {
      currentUser: {
        displayName,
        totalScore,
        globalRank: null,
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
      displayName: await getSessionDisplayName(),
      totalScore: 0,
      globalRank: null,
      currentStreak: 0,
      longestStreak: 0,
      unlockedAchievements: 0,
      totalAchievements: 0,
    },
    bmi: data.bmi ?? {
      heightCm: null,
      weightKg: null,
      bmi: null,
      status: "normal" as const,
      bmiScore: null,
      targetBmi: null,
      targetWeightKg: null,
      deadline: null,
      goalId: null,
    },
    activeGoals: data.activeGoals ?? [],
    streakHistory: data.streakHistory ?? [],
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
