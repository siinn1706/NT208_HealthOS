import { describe, expect, it } from "vitest";

import { parseOptionalNumberInput } from "@/lib/form-number-input";
import { hydrateCatalogIngredientsNutrition } from "@/lib/meal-ingredient-payload";

describe("meal ingredient payload hydration", () => {
  it("normalizes blank optional calorie inputs before form validation", () => {
    expect(parseOptionalNumberInput("")).toBeUndefined();
    expect(parseOptionalNumberInput(Number.NaN)).toBeUndefined();
    expect(parseOptionalNumberInput(" 109 ")).toBe(109);
  });

  it("fills matched catalog nutrition before sending the manual meal payload", () => {
    const ingredients = hydrateCatalogIngredientsNutrition([
      {
        ingredient_name: "Sợi phở (đã chần)",
        grams: 100,
        is_matched: true,
      },
      {
        ingredient_name: "Nước dùng bò",
        grams: 100,
        is_matched: true,
      },
      {
        ingredient_name: "Thịt bò (thăn nạc, luộc)",
        grams: 200,
        is_matched: true,
      },
    ]);

    expect(ingredients.map((item) => item.manual_calories)).toEqual([109, 12, 430]);
    expect(ingredients[0]).toMatchObject({
      protein_g: 2.2,
      carbs_g: 24.1,
      fat_g: 0.2,
    });
  });
});
