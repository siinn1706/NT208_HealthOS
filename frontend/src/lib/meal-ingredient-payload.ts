import { calcNutrition, findIngredient } from "@/data/ingredients";
import type { MealIngredientFormValues } from "@/lib/validators/meal-schema";

function hasExplicitMacroValues(ingredient: MealIngredientFormValues): boolean {
  return (
    ingredient.protein_g !== undefined ||
    ingredient.carbs_g !== undefined ||
    ingredient.fat_g !== undefined
  );
}

export function hydrateCatalogIngredientNutrition<T extends MealIngredientFormValues>(
  ingredient: T,
): T {
  const grams = Number(ingredient.grams ?? 0);
  if (!Number.isFinite(grams) || grams <= 0 || ingredient.is_matched === false) {
    return ingredient;
  }

  const catalogItem = findIngredient(ingredient.ingredient_name);
  if (!catalogItem || hasExplicitMacroValues(ingredient)) {
    return ingredient;
  }

  const calc = calcNutrition(catalogItem, grams);
  return {
    ...ingredient,
    manual_calories: calc.calories,
    protein_g: calc.protein_g,
    carbs_g: calc.carbs_g,
    fat_g: calc.fat_g,
  };
}

export function hydrateCatalogIngredientsNutrition<T extends MealIngredientFormValues>(
  ingredients: T[],
): T[] {
  return ingredients.map((ingredient) => hydrateCatalogIngredientNutrition(ingredient));
}
