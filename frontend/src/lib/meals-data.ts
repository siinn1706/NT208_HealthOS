/**
 * Meals server-side data helpers.
 * Called ONLY in Server Components (no "use client").
 * They call the BFF /api/v1/* endpoints first, then fall back to mock data on error.
 */

import { headers } from "next/headers";
import type { Meal, DailyNutritionSummary, NutritionSuggestion, WeeklyCaloriePoint } from "@/types/api";

// ---------------------------------------------------------------------------
// Mock data for fallback
// ---------------------------------------------------------------------------

const MOCK_MEALS_TODAY: Meal[] = [
  {
    id: "1",
    name: "Bánh mì sandwich + sữa",
    status: "analyzed",
    logged_at: new Date().toISOString().replace("T", "T07:00:00"),
    created_at: new Date().toISOString().replace("T", "T07:00:00"),
    meal_type: "breakfast",
    ingredients: [
      { is_custom: false, ingredient_name: "Bánh mì sandwich", grams: 80, calories: 200, protein_g: 6, carbs_g: 30, fat_g: 5 },
      { is_custom: false, ingredient_name: "Sữa", grams: 200, calories: 100, protein_g: 8, carbs_g: 12, fat_g: 3 },
    ],
    nutrition_result: { calories: 450, protein_g: 25, carbs_g: 50, fat_g: 15, confidence: 0.85 },
  },
  {
    id: "2",
    name: "Cơm + thịt gà + rau",
    status: "analyzed",
    logged_at: new Date().toISOString().replace("T", "T12:00:00"),
    created_at: new Date().toISOString().replace("T", "T12:00:00"),
    meal_type: "lunch",
    ingredients: [
      { is_custom: false, ingredient_name: "Cơm", grams: 200, calories: 260, protein_g: 4, carbs_g: 56, fat_g: 0.5 },
      { is_custom: false, ingredient_name: "Thịt gà", grams: 100, calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
      { is_custom: false, ingredient_name: "Rau", grams: 100, calories: 25, protein_g: 2, carbs_g: 5, fat_g: 0.2 },
    ],
    nutrition_result: { calories: 650, protein_g: 35, carbs_g: 70, fat_g: 20, confidence: 0.9 },
  },
  {
    id: "3",
    name: "Cơm + cá + canh",
    status: "analyzed",
    logged_at: new Date().toISOString().replace("T", "T18:30:00"),
    created_at: new Date().toISOString().replace("T", "T18:30:00"),
    meal_type: "dinner",
    ingredients: [
      { is_custom: false, ingredient_name: "Cơm", grams: 200, calories: 260, protein_g: 4, carbs_g: 56, fat_g: 0.5 },
      { is_custom: false, ingredient_name: "Cá", grams: 100, calories: 136, protein_g: 20, carbs_g: 0, fat_g: 5 },
      { is_custom: false, ingredient_name: "Canh", grams: 200, calories: 30, protein_g: 2, carbs_g: 4, fat_g: 1 },
    ],
    nutrition_result: { calories: 520, protein_g: 30, carbs_g: 55, fat_g: 18, confidence: 0.88 },
  },
];

const MOCK_MEALS_HISTORY: DailyNutritionSummary[] = [
  { date: "2026-03-06", total_calories: 1650, total_protein_g: 65, total_carbs_g: 220, total_fat_g: 55, calorie_target: 2000, meals: MOCK_MEALS_TODAY },
  { date: "2026-03-07", total_calories: 1800, total_protein_g: 70, total_carbs_g: 240, total_fat_g: 60, calorie_target: 2000, meals: MOCK_MEALS_TODAY },
  { date: "2026-03-08", total_calories: 1700, total_protein_g: 68, total_carbs_g: 230, total_fat_g: 52, calorie_target: 2000, meals: MOCK_MEALS_TODAY },
  { date: "2026-03-09", total_calories: 1100, total_protein_g: 45, total_carbs_g: 150, total_fat_g: 35, calorie_target: 2000, meals: MOCK_MEALS_TODAY },
  { date: "2026-03-10", total_calories: 1900, total_protein_g: 75, total_carbs_g: 250, total_fat_g: 65, calorie_target: 2000, meals: MOCK_MEALS_TODAY },
  { date: "2026-03-11", total_calories: 1750, total_protein_g: 70, total_carbs_g: 235, total_fat_g: 58, calorie_target: 2000, meals: MOCK_MEALS_TODAY },
  { date: "2026-03-12", total_calories: 1620, total_protein_g: 62, total_carbs_g: 215, total_fat_g: 50, calorie_target: 2000, meals: MOCK_MEALS_TODAY },
];

const MOCK_NUTRITION_SUGGESTIONS: NutritionSuggestion[] = [
  {
    id: "1",
    type: "warning",
    icon: "AlertCircle",
    title: "Cần bổ sung thêm protein",
    message: "Hôm nay bạn mới chỉ tiêu thụ 90g protein. Nên thêm 20g nữa.",
    priority: 1,
    cta: { label: "Xem gợi ý", href: "/vi/dashboard/meals" },
  },
  {
    id: "2",
    type: "tip",
    icon: "Droplet",
    title: "Uống đủ nước",
    message: "Bạn đã uống 1.5L nước hôm nay. Hãy uống thêm 500ml nữa!",
    priority: 2,
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
    date: d.date.slice(5), // MM-DD
    full_date: d.date,
    calories: d.total_calories,
    protein_g: d.total_protein_g,
    carbs_g: d.total_carbs_g,
    fat_g: d.total_fat_g,
    target: d.calorie_target,
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
