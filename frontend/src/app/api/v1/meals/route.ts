/**
 * BFF Meals Route — /api/v1/meals
 * GET  → list today's meals (proxied from Core BE / mock)
 * POST → create a new meal with ingredients
 */

import { NextRequest, NextResponse } from "next/server";
import { addMealSchema } from "@/lib/validators/meal-schema";
import { findIngredient, calcNutrition } from "@/data/ingredients";
import type { Meal, NutritionResult } from "@/types/api";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get("page") ?? "1";
  const perPage = req.nextUrl.searchParams.get("per_page") ?? "20";
  const dateFrom = req.nextUrl.searchParams.get("date_from");
  const dateTo = req.nextUrl.searchParams.get("date_to");

  // TODO: auth check
  try {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const res = await fetch(`${CORE_API_URL}/v1/meals?${params}`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "Failed to fetch meals." } },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Core BE offline — return empty mock during local dev
    return NextResponse.json({ data: [], meta: { page: 1, per_page: 20, total: 0 } });
  }
}

export async function POST(req: NextRequest) {
  // TODO: auth check

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  // Validate
  const parsed = addMealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid meal data.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const { name, meal_type, logged_at, notes, ingredients } = parsed.data;

  // Compute nutrition from ingredients
  const resolvedIngredients = ingredients.map((ing) => {
    const dbItem = findIngredient(ing.ingredient_name);
    if (dbItem) {
      const calc = calcNutrition(dbItem, ing.grams);
      return {
        ingredient_name: ing.ingredient_name,
        grams: ing.grams,
        ...calc,
        is_custom: false,
      };
    }
    // Custom ingredient — use manually entered calories if provided
    const kcal = ing.manual_calories ?? 0;
    const kcalPer100 = ing.grams > 0 ? (kcal / ing.grams) * 100 : 0;
    return {
      ingredient_name: ing.ingredient_name,
      grams: ing.grams,
      calories: kcal,
      protein_g: 0,
      carbs_g: Math.round(kcalPer100 * 0.5 * ing.grams) / 100, // rough estimate
      fat_g: 0,
      is_custom: true,
    };
  });

  const totals = resolvedIngredients.reduce(
    (acc, ing) => {
      acc.calories += ing.calories;
      acc.protein_g += ing.protein_g;
      acc.carbs_g += ing.carbs_g;
      acc.fat_g += ing.fat_g;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const nutritionResult: NutritionResult = {
    calories: Math.round(totals.calories * 10) / 10,
    protein_g: Math.round(totals.protein_g * 10) / 10,
    carbs_g: Math.round(totals.carbs_g * 10) / 10,
    fat_g: Math.round(totals.fat_g * 10) / 10,
    confidence: 1.0, // manual entry = full confidence
  };

  // Try to forward to Core BE
  try {
    const corePayload = {
      name,
      notes: notes ?? null,
      logged_at: logged_at ?? new Date().toISOString(),
    };

    const coreRes = await fetch(`${CORE_API_URL}/v1/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corePayload),
    });

    if (coreRes.ok) {
      const coreData = await coreRes.json();
      // Merge our computed nutrition into Core BE response
      const merged: Meal = {
        ...coreData.data,
        meal_type,
        ingredients: resolvedIngredients,
        nutrition_result: nutritionResult,
      };
      return NextResponse.json({ data: merged }, { status: 201 });
    }
  } catch {
    // Core BE offline — return a mock response for local dev
  }

  // Fallback: return locally-computed meal (dev mode)
  const mockMeal: Meal = {
    id: `meal-mock-${Date.now()}`,
    name,
    status: "analyzed",
    meal_type,
    ingredients: resolvedIngredients,
    nutrition_result: nutritionResult,
    logged_at: logged_at ?? new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  return NextResponse.json({ data: mockMeal }, { status: 201 });
}
