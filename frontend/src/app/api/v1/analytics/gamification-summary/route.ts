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

  const profileRes = await coreFetch("/v1/users/me", token);

  const profile = profileRes as { display_name?: string; name?: string; height_cm?: number; weight_kg?: number } | null;

  // Build current user from profile
  const displayName = profile?.display_name ?? profile?.name ?? "User";

  const response = {
    currentUser: {
      displayName,
      totalScore: 0,
      globalRank: 1,
      currentStreak: 0,
      longestStreak: 0,
      unlockedAchievements: 0,
      totalAchievements: 20,
    },
    bmi: {
      heightCm: profile?.height_cm ?? null,
      weightKg: profile?.weight_kg ?? null,
      bmi: (profile?.height_cm && profile?.weight_kg)
        ? parseFloat((profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1))
        : null,
      status: (() => {
        const bmi = (profile?.height_cm && profile?.weight_kg)
          ? parseFloat((profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1))
          : null;
        if (bmi === null) return "normal";
        if (bmi < 18.5) return "underweight";
        if (bmi < 25) return "normal";
        if (bmi < 30) return "overweight";
        return "obese";
      })(),
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
