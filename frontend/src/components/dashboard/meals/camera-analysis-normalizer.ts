export interface AnalysisIngredient {
  ingredient_name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type PortionValue = "small" | "medium" | "large";

export interface PortionOption {
  value: PortionValue;
  label: string;
  scale: number;
  calories?: number;
  calorie_min?: number;
  calorie_max?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface AnalysisNutritionDetails {
  dish_name?: string;
  serving_type?: string;
  calories?: number;
  calorie_min?: number;
  calorie_max?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  saturates_g?: number;
  sugar_g?: number;
  salt_g?: number;
  ingredients?: AnalysisIngredient[];
  portion_estimate?: string;
  portion_options?: PortionOption[];
  selected_portion?: PortionValue;
  warnings?: string[];
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
const PORTIONS: Array<[PortionValue, string, number]> = [
  ["small", "Ít", 0.75],
  ["medium", "Vừa", 1],
  ["large", "Nhiều", 1.25],
];

export const DEFAULT_PORTION_OPTIONS: PortionOption[] = PORTIONS.map(
  ([value, label, scale]) => ({ value, label, scale }),
);

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

function roundNumber(value: number): number {
  return Math.round(value * 10) / 10;
}

function readMealType(value: unknown): MealType | undefined {
  return typeof value === "string" && MEAL_TYPES.has(value as MealType)
    ? (value as MealType)
    : undefined;
}

function readWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizePortionValue(value: unknown): PortionValue | undefined {
  return value === "small" || value === "medium" || value === "large"
    ? value
    : undefined;
}

function normalizePortionOptions(value: unknown): PortionOption[] {
  if (!Array.isArray(value)) return DEFAULT_PORTION_OPTIONS;
  const options = value.flatMap((item) => {
    const row = asRecord(item);
    const portionValue = normalizePortionValue(row?.value);
    const label = readString(row?.label);
    const scale = readNumber(row?.scale) ?? readNumber(row?.multiplier);
    if (!row || !portionValue || !label || scale === undefined || scale <= 0) {
      return [];
    }
    return [{
      value: portionValue,
      label,
      scale,
      calories: readNumber(row.calories),
      calorie_min: readNumber(row.calorie_min),
      calorie_max: readNumber(row.calorie_max),
      protein_g: readNumber(row.protein_g),
      carbs_g: readNumber(row.carbs_g),
      fat_g: readNumber(row.fat_g),
    }];
  });
  return options.length > 0 ? options : DEFAULT_PORTION_OPTIONS;
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

  const nutritionDetails = nutrition
    ? {
        dish_name: readString(nutrition.dish_name),
        serving_type: readString(nutrition.serving_type),
        calories: readNumber(nutrition.calories),
        calorie_min: readNumber(nutrition.calorie_min),
        calorie_max: readNumber(nutrition.calorie_max),
        protein_g: readNumber(nutrition.protein_g),
        carbs_g: readNumber(nutrition.carbs_g),
        fat_g: readNumber(nutrition.fat_g),
        saturates_g: readNumber(nutrition.saturates_g),
        sugar_g: readNumber(nutrition.sugar_g),
        salt_g: readNumber(nutrition.salt_g),
        ingredients,
        portion_estimate: readString(nutrition.portion_estimate),
        portion_options: normalizePortionOptions(nutrition.portion_options),
        selected_portion: "medium" as PortionValue,
        warnings: readWarnings(nutrition.warnings),
        source: readString(nutrition.source),
      }
    : undefined;

  return {
    name,
    meal_type:
      readMealType(nutrition?.meal_type) ??
      readMealType(nutrition?.serving_type) ??
      "lunch",
    ingredients,
    estimatedCalories: readNumber(nutrition?.calories) ?? null,
    confidence: readNumber(nutrition?.confidence) ?? null,
    nutrition: nutritionDetails,
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
  return roundNumber(total);
}

export function getAnalysisCalorieRange(result: AnalysisResult | null): string {
  const min = result?.nutrition?.calorie_min;
  const max = result?.nutrition?.calorie_max;
  if (typeof min === "number" && typeof max === "number" && max > 0) {
    return `${Math.round(min)}-${Math.round(max)}`;
  }
  return String(Math.round(getAnalysisTotalCalories(result)));
}

function scaleIngredient(item: AnalysisIngredient, scale: number): AnalysisIngredient {
  return {
    ...item,
    calories: roundNumber(item.calories * scale),
    protein_g: roundNumber(item.protein_g * scale),
    carbs_g: roundNumber(item.carbs_g * scale),
    fat_g: roundNumber(item.fat_g * scale),
  };
}

export function scaleAnalysisResultPortion(
  result: AnalysisResult,
  portionValue: PortionValue,
): AnalysisResult {
  const options = result.nutrition?.portion_options ?? DEFAULT_PORTION_OPTIONS;
  const option = options.find((item) => item.value === portionValue)
    ?? DEFAULT_PORTION_OPTIONS.find((item) => item.value === portionValue)
    ?? DEFAULT_PORTION_OPTIONS[1];
  const scale = option.scale;
  const ingredients = result.ingredients.map((item) => scaleIngredient(item, scale));
  return {
    ...result,
    ingredients,
    estimatedCalories:
      typeof result.estimatedCalories === "number"
        ? roundNumber(result.estimatedCalories * scale)
        : result.estimatedCalories,
    nutrition: result.nutrition
      ? {
          ...result.nutrition,
          calories: option.calories ?? (
            typeof result.nutrition.calories === "number"
              ? roundNumber(result.nutrition.calories * scale)
              : undefined
          ),
          calorie_min: option.calorie_min ?? (
            typeof result.nutrition.calorie_min === "number"
              ? roundNumber(result.nutrition.calorie_min * scale)
              : undefined
          ),
          calorie_max: option.calorie_max ?? (
            typeof result.nutrition.calorie_max === "number"
              ? roundNumber(result.nutrition.calorie_max * scale)
              : undefined
          ),
          protein_g: option.protein_g ?? (
            typeof result.nutrition.protein_g === "number"
              ? roundNumber(result.nutrition.protein_g * scale)
              : undefined
          ),
          carbs_g: option.carbs_g ?? (
            typeof result.nutrition.carbs_g === "number"
              ? roundNumber(result.nutrition.carbs_g * scale)
              : undefined
          ),
          fat_g: option.fat_g ?? (
            typeof result.nutrition.fat_g === "number"
              ? roundNumber(result.nutrition.fat_g * scale)
              : undefined
          ),
          ingredients,
          selected_portion: option.value,
        }
      : undefined,
  };
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
