/**
 * Fetches daily calorie totals from /v1/meals and returns GoalProgressPoint[].
 * Calories are NOT in MetricTypeEnum — this is the correct data source.
 */

export interface GoalProgressPoint {
  date: string;
  value: number;
  target: number;
  progress_percent: number | null;
}

export async function getMealCaloriesByDay(
  dateFrom: string,
  dateTo: string,
  target: number = 2000
): Promise<GoalProgressPoint[]> {
  const res = await fetch(
    `/api/v1/meals?date_from=${dateFrom}&date_to=${dateTo}`,
    { credentials: "include" }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const meals: Array<{ recorded_at?: string; calories?: number }> = data?.data ?? [];

  const byDate = new Map<string, number>();
  for (const meal of meals) {
    const day = meal.recorded_at?.split("T")[0];
    if (!day) continue;
    const current = byDate.get(day) ?? 0;
    const calories = meal.calories ?? 0;
    byDate.set(day, current + calories);
  }

  return Array.from(byDate.entries()).map(([date, value]) => ({
    date,
    value,
    target,
    progress_percent: target > 0 ? Math.round((value / target) * 100 * 10) / 10 : null,
  }));
}
