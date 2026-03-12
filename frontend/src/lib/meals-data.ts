/**
 * Meals server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * They call the BFF /api/v1/* endpoints first, then fall back to mock data on error.
 */

import { headers } from "next/headers";
import type { Meal, DailyNutritionSummary, NutritionSuggestion, WeeklyCaloriePoint } from "@/types/api";

const CALORIE_TARGET = 2000;

// ---------------------------------------------------------------------------
// Mock data for fallback
// ---------------------------------------------------------------------------

const MOCK_MEALS_TODAY: Meal[] = [
  {
    id: "1",
    user_id: "user-1",
    logged_at: new Date().toISOString().replace("T", "T07:00:00"),
    meal_type: "breakfast",
    image_url: null,
    nutrition_result: { calories: 450, protein_g: 25, carbs_g: 50, fat_g: 15 },
    description: "Bánh mì sandwich + sữa",
  },
  {
    id: "2",
    user_id: "user-1",
    logged_at: new Date().toISOString().replace("T", "T12:00:00"),
    meal_type: "lunch",
    image_url: null,
    nutrition_result: { calories: 650, protein_g: 35, carbs_g: 70, fat_g: 20 },
    description: "Cơm + thịt gà + rau",
  },
  {
    id: "3",
    user_id: "user-1",
    logged_at: new Date().toISOString().replace("T", "T18:30:00"),
    meal_type: "dinner",
    image_url: null,
    nutrition_result: { calories: 520, protein_g: 30, carbs_g: 55, fat_g: 18 },
    description: "Cơm + cá + canh",
  },
];

const MOCK_MEALS_HISTORY: DailyNutritionSummary[] = [
  { date: "2026-03-06", meals: 3, total_calories: 1650, avg_calories: 1650 },
  { date: "2026-03-07", meals: 3, total_calories: 1800, avg_calories: 1800 },
  { date: "2026-03-08", meals: 3, total_calories: 1700, avg_calories: 1700 },
  { date: "2026-03-09", meals: 2, total_calories: 1100, avg_calories: 1100 },
  { date: "2026-03-10", meals: 3, total_calories: 1900, avg_calories: 1900 },
  { date: "2026-03-11", meals: 3, total_calories: 1750, avg_calories: 1750 },
  { date: "2026-03-12", meals: 3, total_calories: 1620, avg_calories: 1620 },
];

const MOCK_NUTRITION_SUGGESTIONS: NutritionSuggestion[] = [
  {
    id: "1",
    type: "warning",
    title: "Cần bổ sung thêm protein",
    message: "Hôm nay bạn mới chỉ tiêu thụ 90g protein. Nên thêm 20g nữa.",
    action_label: "Xem gợi ý",
  },
  {
    id: "2",
    type: "tip",
    title: "Uống đủ nước",
    message: "Bạn đã uống 1.5L nước hôm nay. Hãy uống thêm 500ml nữa!",
    action_label: null,
  },
];

// ---------------------------------------------------------------------------
// Data access helpers
// ---------------------------------------------------------------------------

/** Return today's meals sorted by logged_at ASC */
export async function getMealsToday(): Promise<Meal[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const today = new Date().toISOString().split("T")[0];
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/meals?date=${today}`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      console.warn("[meals-data] Failed to fetch meals today, using mock data");
      return MOCK_MEALS_TODAY;
    }
    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data)) {
      console.warn("[meals-data] Invalid response, using mock data");
      return MOCK_MEALS_TODAY;
    }
    return data.sort(
      (a: Meal, b: Meal) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
  } catch (error) {
    console.warn("[meals-data] Error fetching meals today:", error);
    return MOCK_MEALS_TODAY;
  }
}

/** Return all meals for the last N days, grouped by date */
export async function getMealsHistory(days = 7): Promise<DailyNutritionSummary[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/meals?days=${days}`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      console.warn("[meals-data] Failed to fetch meals history, using mock data");
      return MOCK_MEALS_HISTORY;
    }
    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data)) {
      console.warn("[meals-data] Invalid history response, using mock data");
      return MOCK_MEALS_HISTORY;
    }
    return data;
  } catch (error) {
    console.warn("[meals-data] Error fetching meals history:", error);
    return MOCK_MEALS_HISTORY;
  }
}

/** Return calorie data for the past 7 days (for bar chart) */
export async function getWeeklyCalorieChart(): Promise<WeeklyCaloriePoint[]> {
  // Return mock data for now
  return MOCK_MEALS_HISTORY.map((d) => ({
    date: d.date,
    calories: d.total_calories,
  }));
}

/** Return nutrition suggestions based on today's intake */
export async function getNutritionSuggestions(): Promise<NutritionSuggestion[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/nutrition/suggestions`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) {
      console.warn("[meals-data] Failed to fetch nutrition suggestions, using mock data");
      return MOCK_NUTRITION_SUGGESTIONS;
    }
    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data)) {
      console.warn("[meals-data] Invalid suggestions response, using mock data");
      return MOCK_NUTRITION_SUGGESTIONS;
    }
    return data;
  } catch (error) {
    console.warn("[meals-data] Error fetching nutrition suggestions:", error);
    return MOCK_NUTRITION_SUGGESTIONS;
  }
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
