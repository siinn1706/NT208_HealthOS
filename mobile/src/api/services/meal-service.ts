import { apiRequest, buildQuery, createUploadFormData } from '../client';
import type { CalorieSummaryPoint, DataResponse, Meal, MealIngredient, MealNutritionResult, PaginatedResponse } from '../../../../shared/api-contracts';

export interface MobileUploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface MealCreateInput {
  name: string;
  notes?: string | null;
  logged_at?: string | null;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  ingredients?: {
    ingredient_id?: string | null;
    ingredient_name: string;
    ingredient_name_en?: string | null;
    grams: number;
    manual_calories?: number | null;
    calories?: number | null;
    kcal?: number | null;
    carbs_g?: number | null;
    protein_g?: number | null;
    fat_g?: number | null;
    is_matched?: boolean | null;
  }[];
  image?: MobileUploadFile | null;
}

export interface MealCreateOptions {
  idempotencyKey?: string | null;
}

export interface MealAnalysisStatus {
  meal_id?: string;
  job_id: string | null;
  status: string;
  nutrition_result?: MealNutritionResult | null;
  result?: MealNutritionResult | null;
  error?: { code: string; message: string } | null;
}

export const mealService = {
  async list(params: { page?: number; per_page?: number; date_from?: string; date_to?: string } = {}) {
    const response = await apiRequest<PaginatedResponse<Meal>>(`/v1/meals${buildQuery({
      page: params.page,
      per_page: params.per_page,
      date_from: params.date_from,
      date_to: params.date_to,
    })}`);
    return response.data;
  },

  async create(input: MealCreateInput, options: MealCreateOptions = {}) {
    const headers = options.idempotencyKey
      ? { 'Idempotency-Key': options.idempotencyKey }
      : undefined;

    if (input.image) {
      const form = createUploadFormData(
        {
          name: input.name,
          notes: input.notes,
          logged_at: input.logged_at,
        },
        { fieldName: 'image', ...input.image },
      );
      const response = await apiRequest<DataResponse<Meal>>('/v1/meals', {
        method: 'POST',
        body: form,
        headers,
      });
      return response.data;
    }

    const response = await apiRequest<DataResponse<Meal>>('/v1/meals', {
      method: 'POST',
      headers,
      json: compactBody({
        name: input.name,
        notes: input.notes,
        logged_at: input.logged_at,
        meal_type: input.meal_type,
        ingredients: input.ingredients,
      }),
    });
    return response.data;
  },

  async analyzePhoto(input: { name?: string | null; image: MobileUploadFile }) {
    const form = createUploadFormData(
      { name: input.name },
      { fieldName: 'image', ...input.image },
    );
    return apiRequest<MealAnalysisStatus>('/v1/meals/analyze-photo', {
      method: 'POST',
      body: form,
      timeoutMs: 60000,
    });
  },

  async detail(id: string) {
    const response = await apiRequest<DataResponse<Meal>>(`/v1/meals/${encodeURIComponent(id)}`);
    return response.data;
  },

  async update(id: string, body: { name?: string; logged_at?: string; nutrition_result?: MealNutritionResult | null }) {
    const response = await apiRequest<DataResponse<Meal>>(`/v1/meals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: compactBody(body),
    });
    return response.data;
  },

  async delete(id: string) {
    await apiRequest<void>(`/v1/meals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async analysisStatus(id: string) {
    return apiRequest<MealAnalysisStatus>(`/v1/meals/${encodeURIComponent(id)}/analysis-status`);
  },

  async analysisStatusByJob(jobId: string) {
    return apiRequest<MealAnalysisStatus>(`/v1/meals/analyze-photo/${encodeURIComponent(jobId)}`);
  },

  async ingredients(id: string) {
    const response = await apiRequest<DataResponse<MealIngredient[]>>(`/v1/meals/${encodeURIComponent(id)}/ingredients`);
    return response.data;
  },

  async caloriesSummary(date_from: string, date_to: string) {
    const response = await apiRequest<DataResponse<CalorieSummaryPoint[]>>(`/v1/meals/calories-summary${buildQuery({
      date_from,
      date_to,
    })}`);
    return response.data;
  },
};

function compactBody<T extends Record<string, unknown>>(body: T) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
