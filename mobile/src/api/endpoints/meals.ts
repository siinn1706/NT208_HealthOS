import { apiFetch, apiUpload } from "../client";
import { appendFilePart, type FilePart } from "../formdata";

export type MealStatus = "pending" | "analyzing" | "analyzed" | "failed";

export interface MealResponse {
  id: string;
  name: string;
  image_url?: string | null;
  job_id?: string | null;
  status: MealStatus;
  nutrition_result?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    items?: Array<{ name: string; calories?: number }>;
  } | null;
  logged_at: string;
  created_at: string;
  notes?: string | null;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface CreateMealJson {
  name: string;
  notes?: string;
  logged_at?: string;
}

export async function listMeals(opts: {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
} = {}): Promise<{ data: MealResponse[]; meta: PaginationMeta }> {
  return apiFetch<{ data: MealResponse[]; meta: PaginationMeta }>(
    "/v1/meals",
    { query: opts }
  );
}

export async function getMeal(id: string): Promise<MealResponse> {
  const res = await apiFetch<{ data: MealResponse }>(`/v1/meals/${id}`);
  return res.data;
}

export async function createMealJson(payload: CreateMealJson): Promise<MealResponse> {
  const res = await apiFetch<{ data: MealResponse }>("/v1/meals", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function createMealMultipart(input: {
  name: string;
  notes?: string;
  logged_at?: string;
  image?: FilePart;
}): Promise<MealResponse> {
  const fd = new FormData();
  fd.append("name_form", input.name);
  if (input.notes) fd.append("notes_form", input.notes);
  if (input.logged_at) fd.append("logged_at_form", input.logged_at);
  if (input.image) {
    appendFilePart(fd, "image", input.image);
  }
  const res = await apiUpload<{ data: MealResponse }>("/v1/meals", fd);
  return res.data;
}

export interface AnalyzePhotoResponse {
  job_id: string;
  status: string;
}

export async function analyzePhoto(input: {
  name: string;
  image: FilePart;
}): Promise<AnalyzePhotoResponse> {
  const fd = new FormData();
  fd.append("name", input.name);
  appendFilePart(fd, "image", input.image);
  return apiUpload<AnalyzePhotoResponse>("/v1/meals/analyze-photo", fd);
}

export interface AnalysisStatus {
  meal_id: string;
  job_id?: string | null;
  status: MealStatus | string;
  nutrition_result?: MealResponse["nutrition_result"];
}

export async function getAnalysisStatus(mealId: string): Promise<AnalysisStatus> {
  return apiFetch<AnalysisStatus>(`/v1/meals/${mealId}/analysis-status`);
}

export interface CaloriesPoint {
  date: string;
  total_calories: number;
}

/**
 * Note: The Core BE route is suspect (route ordering + missing imports).
 * Per audit in [meals.py](backend/app/api/v1/endpoints/meals.py).
 * Callers should fall back to client-side aggregation from listMeals if this throws.
 */
export async function fetchCaloriesSummary(opts: {
  date_from: string;
  date_to: string;
}): Promise<CaloriesPoint[]> {
  const res = await apiFetch<{ data: CaloriesPoint[] }>(
    "/v1/meals/calories-summary",
    { query: opts }
  );
  return res.data;
}
