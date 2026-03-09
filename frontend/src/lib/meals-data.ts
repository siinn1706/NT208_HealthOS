/**
 * Meals server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * First attempts BFF call, falls back to mock data when unavailable.
 */

import type { Meal, DailyNutritionSummary, NutritionSuggestion, WeeklyCaloriePoint } from "@/types/api";
import { MOCK_MEALS, MOCK_NUTRITION_SUGGESTIONS, getMockWeeklyCalorieData } from "@/data/meals";

const CALORIE_TARGET = 2000;

// BFF TODO: GET /api/v1/meals
//   Trigger: Page load on /dashboard/meals
//   Request: { date?: string } — filter by date (YYYY-MM-DD)
//   Response: { data: Meal[] }
//   Fallback: MOCK_MEALS filtered by date

/** Return today's meals sorted by logged_at ASC */
export async function getMealsToday(): Promise<Meal[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const today = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(`${appUrl}/api/v1/meals?date=${today}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (Array.isArray(data)) {
        return data.sort(
          (a: Meal, b: Meal) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
        );
      }
    }
  } catch {
    // BFF unavailable — fallback to mock
  }

  // Fallback: filter mock by today
  return MOCK_MEALS.filter(
    (m) => new Date(m.logged_at).toDateString() === new Date().toDateString()
  ).sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );
}

// BFF TODO: GET /api/v1/meals?days=7
//   Trigger: Meals history page
//   Request: { days?: number }
//   Response: { data: DailyNutritionSummary[] }
//   Fallback: Computed from MOCK_MEALS

/** Return all meals for the last N days, grouped by date */
export async function getMealsHistory(days = 7): Promise<DailyNutritionSummary[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const res = await fetch(`${appUrl}/api/v1/meals?days=${days}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // BFF unavailable — fallback to mock
  }

  // Fallback: compute from mock
  const result: DailyNutritionSummary[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const dayMeals = MOCK_MEALS.filter(
      (m) => m.logged_at.startsWith(dateStr)
    );

    const totals = dayMeals.reduce(
      (acc, m) => {
        const nr = m.nutrition_result;
        if (nr) {
          acc.calories += nr.calories;
          acc.protein += nr.protein_g;
          acc.carbs += nr.carbs_g;
          acc.fat += nr.fat_g;
        }
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    result.push({
      date: dateStr,
      total_calories: Math.round(totals.calories),
      total_protein_g: Math.round(totals.protein * 10) / 10,
      total_carbs_g: Math.round(totals.carbs * 10) / 10,
      total_fat_g: Math.round(totals.fat * 10) / 10,
      calorie_target: CALORIE_TARGET,
      meals: dayMeals,
    });
  }

  return result;
}

/** Return calorie data for the past 7 days (for bar chart) */
export async function getWeeklyCalorieChart(): Promise<WeeklyCaloriePoint[]> {
  // TODO V1: bffFetch("/api/v1/health-data/nutrition?range=7d")
  return getMockWeeklyCalorieData();
}

/** Return nutrition suggestions based on today's intake */
// BFF TODO: GET /api/v1/nutrition/suggestions
//   Trigger: Page load on /dashboard/meals
//   Response: { data: NutritionSuggestion[] }
//   Fallback: MOCK_NUTRITION_SUGGESTIONS

export async function getNutritionSuggestions(): Promise<NutritionSuggestion[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${appUrl}/api/v1/nutrition/suggestions`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data;
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // BFF unavailable — fallback to mock
  }
  return MOCK_NUTRITION_SUGGESTIONS;
}

/** Summarise today's total nutrition (for form confirmation preview) */
export function sumNutrition(meals: Meal[]): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  return meals.reduce(
    (acc, m) => {
      if (m.nutrition_result) {
        acc.calories += m.nutrition_result.calories;
        acc.protein_g += m.nutrition_result.protein_g;
        acc.carbs_g += m.nutrition_result.carbs_g;
        acc.fat_g += m.nutrition_result.fat_g;
      }
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}
