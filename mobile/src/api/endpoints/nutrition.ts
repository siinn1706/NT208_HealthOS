import { apiFetch, unwrapData } from "../client";

/**
 * Mirrors backend `app/schemas/dashboard.py:NutritionSuggestionDTO` returned
 * from `GET /v1/nutrition/suggestions`. All non-optional fields are required.
 */
export interface NutritionSuggestion {
  id: string;
  type: string;
  icon: string;
  title: string;
  message: string;
  message_params?: Record<string, number> | null;
  priority: number;
  cta?: Record<string, string> | null;
}

export async function fetchNutritionSuggestions(): Promise<NutritionSuggestion[]> {
  const res = await apiFetch<{ data: NutritionSuggestion[] }>(
    "/v1/nutrition/suggestions"
  );
  return unwrapData(res);
}
