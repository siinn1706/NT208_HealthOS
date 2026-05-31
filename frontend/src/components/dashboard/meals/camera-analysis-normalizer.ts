export interface AnalysisIngredient {
  ingredient_name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface AnalysisNutritionDetails {
  dish_name?: string;
  serving_type?: string;
  saturates_g?: number;
  sugar_g?: number;
  salt_g?: number;
  source?: string;
}

export interface AnalysisResult {
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: AnalysisIngredient[];
  estimatedCalories: number | null;
  nutrition?: AnalysisNutritionDetails;
  confidence: number | null;
  imageDataUrl?: string | null;
}

type MealType = AnalysisResult["meal_type"];

export interface SnapPrefillPayload {
  name?: string;
  meal_type?: MealType;
  ingredients?: Array<{
    ingredient_name?: string;
    grams?: number;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  }>;
  estimatedCalories?: number | null;
  nutrition?: AnalysisNutritionDetails;
  needs_review?: boolean;
  confidence?: number | null;
  captured_at?: string;
}

const MEAL_TYPES = new Set<MealType>(["breakfast", "lunch", "dinner", "snack"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(value, 0)
    : undefined;
}

function readMealType(value: unknown): MealType | undefined {
  return typeof value === "string" && MEAL_TYPES.has(value as MealType)
    ? (value as MealType)
    : undefined;
}

function normalizeIngredient(item: unknown): AnalysisIngredient | null {
  const row = asRecord(item);
  if (!row) return null;

  const ingredientName = readString(row.ingredient_name) ?? readString(row.name);
  if (!ingredientName) return null;

  return {
    ingredient_name: ingredientName,
    grams: readNumber(row.grams) ?? 100,
    calories: readNumber(row.calories) ?? readNumber(row.kcal) ?? 0,
    protein_g: readNumber(row.protein_g) ?? 0,
    carbs_g: readNumber(row.carbs_g) ?? 0,
    fat_g: readNumber(row.fat_g) ?? 0,
  };
}

function normalizeIngredientList(value: unknown): AnalysisIngredient[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const normalized = normalizeIngredient(item);
        return normalized ? [normalized] : [];
      })
    : [];
}

function buildAggregateIngredient(
  nutrition: Record<string, unknown> | null,
  fallbackName: string,
): AnalysisIngredient[] {
  if (!nutrition) return [];

  const calories = readNumber(nutrition.calories) ?? 0;
  const ingredientName =
    readString(nutrition.dish_name) ?? (fallbackName.trim() || "Photo meal");

  if (calories <= 0) return [];

  return [
    {
      ingredient_name: ingredientName,
      grams: 100,
      calories,
      protein_g: readNumber(nutrition.protein_g) ?? 0,
      carbs_g: readNumber(nutrition.carbs_g) ?? 0,
      fat_g: readNumber(nutrition.fat_g) ?? 0,
    },
  ];
}

export function buildAnalysisResultFromMeal(
  meal: Record<string, unknown>,
  imageDataUrl: string | null,
): AnalysisResult {
  const nutrition = asRecord(meal.nutrition_result);
  const fallbackName = readString(meal.name) ?? "Photo meal";
  const name = readString(nutrition?.dish_name) ?? fallbackName;

  const normalizedIngredients = normalizeIngredientList(nutrition?.ingredients);
  const ingredients =
    normalizedIngredients.length > 0
      ? normalizedIngredients
      : buildAggregateIngredient(nutrition, name);

  return {
    name,
    meal_type:
      readMealType(nutrition?.meal_type) ??
      readMealType(nutrition?.serving_type) ??
      "lunch",
    ingredients,
    estimatedCalories: readNumber(nutrition?.calories) ?? null,
    confidence: readNumber(nutrition?.confidence) ?? null,
    nutrition: nutrition
      ? {
          dish_name: readString(nutrition.dish_name),
          serving_type: readString(nutrition.serving_type),
          saturates_g: readNumber(nutrition.saturates_g),
          sugar_g: readNumber(nutrition.sugar_g),
          salt_g: readNumber(nutrition.salt_g),
          source: readString(nutrition.source),
        }
      : undefined,
    imageDataUrl,
  };
}

export function getAnalysisTotalCalories(result: AnalysisResult | null): number {
  if (!result) return 0;
  const ingredientTotal = result.ingredients.reduce(
    (sum, item) => sum + item.calories,
    0,
  );
  const total = ingredientTotal > 0 ? ingredientTotal : result.estimatedCalories ?? 0;
  return Math.round(total * 10) / 10;
}

export function buildSnapPrefillPayload(
  result: AnalysisResult,
  options: { needsReview?: boolean; capturedAt?: string } = {},
): SnapPrefillPayload {
  return {
    name: result.name,
    meal_type: result.meal_type,
    ingredients: result.ingredients.map((item) => ({
      ingredient_name: item.ingredient_name,
      grams: item.grams,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
    })),
    estimatedCalories: result.estimatedCalories,
    nutrition: result.nutrition ? { ...result.nutrition } : undefined,
    confidence: result.confidence,
    needs_review: options.needsReview === true,
    captured_at: options.capturedAt ?? new Date().toISOString(),
  };
}
