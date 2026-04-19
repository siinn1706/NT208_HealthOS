import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { cacheGet, cacheSet, cacheKey } from "@/lib/redis-cache";
import { getUserCacheScope } from "@/lib/user-scoped-cache";

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

export async function GET(_req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  // P0 fix — scope cache key to authenticated user id (was the literal "user",
  // which caused cross-user cache collision and would leak personalized data).
  const userId = await getUserCacheScope();
  const ck = cacheKey(userId, "gamification-summary", {});
  const cached = await cacheGet(ck);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const profileRes = await coreFetch("/v1/users/me", token);

  const profile = profileRes as { display_name?: string; name?: string; height_cm?: number; weight_kg?: number } | null;

  const displayName = profile?.display_name ?? profile?.name ?? "User";

  const heightCm = profile?.height_cm ?? null;
  const weightKg = profile?.weight_kg ?? null;
  const bmi = (heightCm && weightKg)
    ? parseFloat((weightKg / (heightCm / 100) ** 2).toFixed(1))
    : null;
  const bmiStatus: "underweight" | "normal" | "overweight" | "obese" | null = bmi === null
    ? null
    : bmi < 18.5
      ? "underweight"
      : bmi < 25
        ? "normal"
        : bmi < 30
          ? "overweight"
          : "obese";

  // P0 fix — return null for fields the system has not yet computed instead of
  // fabricating values like `totalAchievements: 20` or `globalRank: 1`. The UI
  // must branch to a neutral "Coming soon" affordance for null fields.
  const response = {
    currentUser: {
      displayName,
      totalScore: 0,
      globalRank: null,
      currentStreak: 0,
      longestStreak: 0,
      unlockedAchievements: 0,
      totalAchievements: null,
    },
    bmi: {
      heightCm,
      weightKg,
      bmi,
      status: bmiStatus,
      bmiScore: null,
      targetBmi: null,
      targetWeightKg: null,
    },
    activeGoals: [],
    streakHistory: [],
    recentUnlocked: [],
  };

  await cacheSet(ck, JSON.stringify(response), 300);
  return NextResponse.json(response);
}
