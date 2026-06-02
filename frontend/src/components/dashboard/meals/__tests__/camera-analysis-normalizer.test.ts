import { describe, expect, it } from "vitest";

import {
  buildAnalysisResultFromMeal,
  buildSnapPrefillPayload,
  getAnalysisCalorieRange,
  getAnalysisTotalCalories,
  scaleAnalysisResultPortion,
} from "../camera-analysis-normalizer";

describe("camera analysis normalizer", () => {
  it("uses aggregate nutrition calories when Core returns no ingredient list", () => {
    const result = buildAnalysisResultFromMeal(
      {
        name: "Photo meal",
        nutrition_result: {
          dish_name: "Chicken rice",
          calories: 512,
          calorie_min: 460,
          calorie_max: 590,
          protein_g: 34,
          carbs_g: 62,
          fat_g: 14,
          portion_options: [
            { value: "small", label: "Ít", scale: 0.75, calories: 384 },
            { value: "medium", label: "Vừa", scale: 1, calories: 512 },
            { value: "large", label: "Nhiều", scale: 1.25, calories: 640 },
          ],
          warnings: ["Confirm portion"],
          confidence: 0.91,
          source: "yolo",
        },
      },
      "data:image/png;base64,test",
    );

    expect(result.name).toBe("Chicken rice");
    expect(result.estimatedCalories).toBe(512);
    expect(getAnalysisTotalCalories(result)).toBe(512);
    expect(getAnalysisCalorieRange(result)).toBe("460-590");
    expect(result.nutrition?.warnings).toEqual(["Confirm portion"]);
    expect(result.ingredients).toEqual([
      {
        ingredient_name: "Chicken rice",
        grams: 100,
        calories: 512,
        protein_g: 34,
        carbs_g: 62,
        fat_g: 14,
      },
    ]);

    const scaled = scaleAnalysisResultPortion(result, "large");
    expect(getAnalysisTotalCalories(scaled)).toBe(640);
    expect(scaled.nutrition?.selected_portion).toBe("large");
  });

  it("preserves AI ingredient breakdown when available", () => {
    const result = buildAnalysisResultFromMeal(
      {
        name: "Photo meal",
        nutrition_result: {
          dish_name: "Lunch plate",
          calories: 500,
          meal_type: "dinner",
          ingredients: [
            { name: "Rice", grams: 150, kcal: 195, carbs_g: 42 },
            { ingredient_name: "Chicken", grams: 100, calories: 165, protein_g: 31 },
          ],
        },
      },
      null,
    );

    expect(result.meal_type).toBe("dinner");
    expect(getAnalysisTotalCalories(result)).toBe(360);
    expect(result.ingredients.map((item) => item.ingredient_name)).toEqual([
      "Rice",
      "Chicken",
    ]);
  });

  it("builds a slim edit prefill without storing the uploaded image", () => {
    const result = buildAnalysisResultFromMeal(
      {
        name: "Photo meal",
        nutrition_result: {
        dish_name: "Bun bo",
        calories: 640,
        calorie_min: 580,
        calorie_max: 730,
        protein_g: 30,
        carbs_g: 84,
        fat_g: 20,
          saturates_g: 6,
          sugar_g: 8,
          salt_g: 2.1,
        confidence: 0.7,
        portion_estimate: "medium",
        portion_options: [{ value: "medium", label: "Vừa", scale: 1 }],
        warnings: ["Check serving"],
        source: "yolo",
      },
      },
      "data:image/jpeg;base64," + "x".repeat(1024),
    );

    const payload = buildSnapPrefillPayload(result, {
      needsReview: true,
      capturedAt: "2026-05-30T08:00:00.000Z",
    });

    expect(payload).not.toHaveProperty("imageDataUrl");
    expect(payload.name).toBe("Bun bo");
    expect(payload.needs_review).toBe(true);
    expect(payload.ingredients).toEqual([
      {
        ingredient_name: "Bun bo",
        grams: 100,
        calories: 640,
        protein_g: 30,
        carbs_g: 84,
        fat_g: 20,
      },
    ]);
    expect(payload.nutrition).toEqual({
      dish_name: "Bun bo",
      serving_type: undefined,
      calories: 640,
      calorie_min: 580,
      calorie_max: 730,
      protein_g: 30,
      carbs_g: 84,
      fat_g: 20,
      saturates_g: 6,
      sugar_g: 8,
      salt_g: 2.1,
      ingredients: [
        {
          ingredient_name: "Bun bo",
          grams: 100,
          calories: 640,
          protein_g: 30,
          carbs_g: 84,
          fat_g: 20,
        },
      ],
      portion_estimate: "medium",
      portion_options: [{ value: "medium", label: "Vừa", scale: 1 }],
      selected_portion: "medium",
      warnings: ["Check serving"],
      source: "yolo",
    });
  });
});
