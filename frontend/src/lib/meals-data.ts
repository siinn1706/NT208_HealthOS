import { headers } from "next/headers";
import type { Meal, DailyNutritionSummary, NutritionSuggestion, WeeklyCaloriePoint } from "@/types/api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DEFAULT_CALORIE_TARGET = 2000;

function startOfDayISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function inferMealType(loggedAt: string): Meal["meal_type"] {
  const hour = new Date(loggedAt).getHours();
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMeal(row: any): Meal {
  const nutrition = row?.nutrition_result;
  const nutritionResult =
    nutrition && typeof nutrition === "object"
      ? {
          dish_name: typeof nutrition.dish_name === "string" ? nutrition.dish_name : undefined,
          serving_type: typeof nutrition.serving_type === "string" ? nutrition.serving_type : undefined,
          calories: typeof nutrition.calories === "number" ? nutrition.calories : 0,
          protein_g: typeof nutrition.protein_g === "number" ? nutrition.protein_g : 0,
          carbs_g: typeof nutrition.carbs_g === "number" ? nutrition.carbs_g : 0,
          fat_g: typeof nutrition.fat_g === "number" ? nutrition.fat_g : 0,
          saturates_g: typeof nutrition.saturates_g === "number" ? nutrition.saturates_g : undefined,
          sugar_g: typeof nutrition.sugar_g === "number" ? nutrition.sugar_g : undefined,
          salt_g: typeof nutrition.salt_g === "number" ? nutrition.salt_g : undefined,
          confidence: typeof nutrition.confidence === "number" ? nutrition.confidence : 0,
          source: typeof nutrition.source === "string" ? nutrition.source : undefined,
        }
      : undefined;

  const loggedAt =
    typeof row?.logged_at === "string" && row.logged_at
      ? row.logged_at
      : new Date().toISOString();

  return {
    id: typeof row?.id === "string" ? row.id : "",
    name: typeof row?.name === "string" && row.name.trim() ? row.name : "",
    status: row?.status === "pending" || row?.status === "processing" || row?.status === "analyzed" || row?.status === "failed"
      ? row.status
      : "pending",
    logged_at: loggedAt,
    created_at:
      typeof row?.created_at === "string" && row.created_at
        ? row.created_at
        : loggedAt,
    ingredients: [],
    meal_type: inferMealType(loggedAt),
    nutrition_result: nutritionResult,
  };
}

async function fetchMeals(
  dateFrom: string,
  dateTo: string,
  perPage = 200
): Promise<Meal[]> {
  try {
    const reqHeaders = await headers();
    const params = new URLSearchParams({
      page: "1",
      per_page: String(perPage),
      date_from: dateFrom,
      date_to: dateTo,
    });
    const res = await fetch(`${APP_URL}/api/v1/meals?${params.toString()}`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    if (!Array.isArray(json?.data)) return [];
    return json.data.map(normalizeMeal);
  } catch {
    return [];
  }
}

/** Return today's meals sorted by logged_at ASC */
export async function getMealsToday(): Promise<Meal[]> {
  const today = startOfDayISO(new Date());
  const data = await fetchMeals(today, today);
  return data.sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );
}

/** Return all meals for the last N days, grouped by date */
export async function getMealsHistory(days = 7): Promise<DailyNutritionSummary[]> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(days - 1, 0));

  const meals = await fetchMeals(startOfDayISO(start), startOfDayISO(end), 500);
  const byDate = new Map<string, Meal[]>();

  for (const meal of meals) {
    const key = new Date(meal.logged_at).toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(meal);
  }

  const results: DailyNutritionSummary[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateKey = startOfDayISO(date);
    const dayMeals = (byDate.get(dateKey) ?? []).sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    const totals = sumNutrition(dayMeals);
    results.push({
      date: dateKey,
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
      calorie_target: DEFAULT_CALORIE_TARGET,
      meals: dayMeals,
    });
  }

  return results;
}

/** Return calorie data for the past 7 days (for bar chart) */
export async function getWeeklyCalorieChart(): Promise<WeeklyCaloriePoint[]> {
  const history = await getMealsHistory(7);
  return history.map((d) => ({
    date: d.date,
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
    const reqHeaders = await headers();
    const res = await fetch(`${APP_URL}/api/v1/nutrition/suggestions`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const data = json?.data;
    if (!Array.isArray(data)) return [];
    return data.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any): NutritionSuggestion => ({
        id: typeof item?.id === "string" ? item.id : "",
        type: item?.type === "warning" || item?.type === "tip" || item?.type === "goal" || item?.type === "success"
          ? item.type
          : "tip",
        icon: typeof item?.icon === "string" ? item.icon : "Info",
        title:
          typeof item?.title === "string" && item.title.trim()
            ? item.title
            : "",
        message:
          typeof item?.message === "string" && item.message.trim()
            ? item.message
            : "",
        priority: typeof item?.priority === "number" ? item.priority : 99,
        message_params:
          item?.message_params && typeof item.message_params === "object" && !Array.isArray(item.message_params)
            ? (item.message_params as Record<string, number>)
            : undefined,
        cta:
          item?.cta && typeof item.cta === "object" && typeof item.cta.label === "string" && typeof item.cta.href === "string"
            ? { label: item.cta.label, href: item.cta.href }
            : undefined,
      })
    );
  } catch {
    return [];
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
    (acc, meal) => {
      if (meal.nutrition_result) {
        acc.calories += meal.nutrition_result.calories;
        acc.protein_g += meal.nutrition_result.protein_g;
        acc.carbs_g += meal.nutrition_result.carbs_g;
        acc.fat_g += meal.nutrition_result.fat_g;
      }
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

