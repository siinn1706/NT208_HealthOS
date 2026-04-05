import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { cacheGet, cacheSet, cacheKey } from "@/lib/redis-cache";

import { CORE_API_URL } from "@/lib/env";

async function getToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

async function coreFetch(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${CORE_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export async function GET(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  // Try Redis cache first (5-min TTL)
  const userId = "user";
  const ck = cacheKey(userId, "gamification-summary", {});
  const cached = await cacheGet(ck);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const [streakRes, bmiRes, goalsRes, profileRes] = await Promise.all([
    coreFetch("/v1/streaks/history?days=56", token),
    coreFetch("/v1/bmi-progress", token),
    coreFetch("/v1/goals/active", token),
    coreFetch("/v1/users/me", token),
  ]);

  const profile = profileRes as { display_name?: string; name?: string; height_cm?: number; weight_kg?: number } | null;
  const streakHistory = (streakRes as { history?: Array<{ date: string; completed: boolean; activitiesCount?: number }> } | null)?.history ?? [];
  const bmiData = bmiRes as { currentBmi?: number; targetBmi?: number; targetDate?: string; heightCm?: number; weightKg?: number; bmiScore?: number } | null;
  const activeGoals = (goalsRes as { goals?: unknown[] } | null)?.goals ?? [];

  // Build current user from profile + streak data
  const displayName = profile?.display_name ?? profile?.name ?? "User";
  const completedDays = streakHistory.filter((e) => e.completed).length;
  const currentStreak = completedDays;
  const longestStreak = streakHistory.reduce<number>((max, e) => (e.completed ? max + 1 : max), 0);

  // Recent unlocked milestones (derived from completed streak days)
  const recentUnlocked = streakHistory
    .filter((e) => e.completed)
    .slice(-5)
    .map((e, i) => ({
      id: `milestone-${e.date}-${i}`,
      activityType: "steps",
      labelKey: "daily-goal",
      targetValue: 1,
      unit: "days",
      pointValue: 10,
      tier: "bronze" as const,
      currentWeek: 1 as const,
      daysThisWeek: 1,
      totalDaysCompleted: 1,
      status: "unlocked" as const,
      unlockedAt: e.date,
    }));

  const response = {
    currentUser: {
      displayName,
      totalScore: (bmiData?.bmiScore ?? 0) + currentStreak * 10 + recentUnlocked.length * 10,
      globalRank: 1,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      unlockedAchievements: recentUnlocked.length,
      totalAchievements: 20,
    },
    bmi: {
      heightCm: bmiData?.heightCm ?? profile?.height_cm ?? null,
      weightKg: bmiData?.weightKg ?? profile?.weight_kg ?? null,
      bmi: bmiData?.currentBmi ?? (profile?.height_cm && profile?.weight_kg
        ? parseFloat((profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1))
        : null),
      status: (() => {
        const bmi = bmiData?.currentBmi ?? (profile?.height_cm && profile?.weight_kg
          ? parseFloat((profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1))
          : null);
        if (bmi === null) return "normal";
        if (bmi < 18.5) return "underweight";
        if (bmi < 25) return "normal";
        if (bmi < 30) return "overweight";
        return "obese";
      })(),
      bmiScore: bmiData?.bmiScore ?? profile?.weight_kg ?? null,
      targetBmi: bmiData?.targetBmi ?? null,
      targetWeightKg: null,
    },
    activeGoals: activeGoals.length > 0 ? activeGoals : [
      { id: "default-steps", activityType: "steps", labelKey: "steps-10000", dailyTarget: 10000, unit: "steps", todayProgress: 0, isActive: true, color: "#41BCE6", createdAt: new Date().toISOString() },
      { id: "default-running", activityType: "running", labelKey: "run-300", dailyTarget: 300, unit: "m", todayProgress: 0, isActive: true, color: "#E3B79A", createdAt: new Date().toISOString() },
    ],
    streakHistory: streakHistory.map((e) => ({
      date: e.date,
      completed: e.completed,
      activitiesCount: e.activitiesCount ?? (e.completed ? 1 : 0),
    })),
    recentUnlocked,
  };

  await cacheSet(ck, JSON.stringify(response), 300);
  return NextResponse.json(response);
}
