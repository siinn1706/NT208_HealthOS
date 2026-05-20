import { apiRequest, buildQuery } from '../client';
import type { CalorieSummaryPoint, DataResponse, Meal, MealIngredient, PaginatedResponse } from '../../../../shared/api-contracts';

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

  async detail(id: string) {
    const response = await apiRequest<DataResponse<Meal>>(`/v1/meals/${encodeURIComponent(id)}`);
    return response.data;
  },

  async update(id: string, body: { name?: string; logged_at?: string }) {
    const response = await apiRequest<DataResponse<Meal>>(`/v1/meals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: body,
    });
    return response.data;
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
