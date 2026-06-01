import type { Meal } from '../../../../shared/api-contracts';
import type { MealCreateInput } from '../../api/services/meal-service';

export interface AddMealHistoryRow {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  subtitle?: string;
  frequencyLabel?: string;
  meal: Meal;
}

function mealTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'previous log';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function mealCalories(meal: Meal) {
  return Math.round(meal.nutrition_result?.calories ?? 0);
}

function mealSubtitle(meal: Meal) {
  const protein = Math.round(meal.nutrition_result?.protein_g ?? 0);
  const carbs = Math.round(meal.nutrition_result?.carbs_g ?? 0);
  const fat = Math.round(meal.nutrition_result?.fat_g ?? 0);
  if (!protein && !carbs && !fat) return undefined;
  return `${protein}g protein · ${carbs}g carbs · ${fat}g fat`;
}

function toRow(meal: Meal, frequencyLabel?: string): AddMealHistoryRow {
  const kcal = mealCalories(meal);
  return {
    id: meal.id,
    name: meal.name,
    serving: `${mealTime(meal.logged_at)} · ${kcal ? `${kcal} kcal` : 'nutrition pending'}`,
    kcal,
    subtitle: mealSubtitle(meal),
    frequencyLabel,
    meal,
  };
}

export function recentMealHistoryRows(meals: Meal[], limit = 5): AddMealHistoryRow[] {
  return meals
    .slice()
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
    .slice(0, limit)
    .map((meal) => toRow(meal));
}

export function frequentMealHistoryRows(meals: Meal[], mealType: string, limit = 3): AddMealHistoryRow[] {
  const normalizedType = mealType.toLowerCase();
  const groups = new Map<string, { count: number; latest: Meal }>();
  meals.forEach((meal) => {
    const historyType = meal.nutrition_result?.meal_type ?? meal.nutrition_result?.serving_type;
    if (historyType && historyType.toLowerCase() !== normalizedType) return;

    const key = meal.name.trim().toLowerCase();
    if (!key) return;

    const current = groups.get(key);
    if (!current || new Date(meal.logged_at).getTime() > new Date(current.latest.logged_at).getTime()) {
      groups.set(key, { count: (current?.count ?? 0) + 1, latest: meal });
    } else {
      groups.set(key, { count: current.count + 1, latest: current.latest });
    }
  });

  return Array.from(groups.values())
    .filter((group) => group.count > 1)
    .sort((a, b) => b.count - a.count || new Date(b.latest.logged_at).getTime() - new Date(a.latest.logged_at).getTime())
    .slice(0, limit)
    .map((group) => toRow(group.latest, `${group.count}× in history`));
}

export function historySelectionNote(row: AddMealHistoryRow) {
  return `Copied from meal history: ${mealTime(row.meal.logged_at)}.`;
}

export function historyMealIngredient(row: AddMealHistoryRow): MealCreateInput['ingredients'] {
  const nutrition = row.meal.nutrition_result;
  if (!nutrition) return undefined;

  const calories = Math.round(nutrition.calories ?? 0);
  const protein = Math.round((nutrition.protein_g ?? 0) * 10) / 10;
  const carbs = Math.round((nutrition.carbs_g ?? 0) * 10) / 10;
  const fat = Math.round((nutrition.fat_g ?? 0) * 10) / 10;
  if (!calories && !protein && !carbs && !fat) return undefined;

  return [{
    ingredient_name: row.name,
    grams: 100,
    manual_calories: calories,
    calories,
    kcal: calories,
    carbs_g: carbs,
    protein_g: protein,
    fat_g: fat,
    is_matched: false,
  }];
}
