import { apiRequest, buildQuery } from '../client';
import type { DataResponse, IngredientCatalogItem, NutritionSuggestion, PaginatedResponse } from '../../../../shared/api-contracts';

export const nutritionService = {
  async suggestions() {
    const response = await apiRequest<DataResponse<NutritionSuggestion[]>>('/api/v1/nutrition/suggestions');
    return response.data;
  },

  async ingredients(params: { q?: string; category?: string; page?: number; per_page?: number } = {}) {
    const response = await apiRequest<PaginatedResponse<IngredientCatalogItem>>(`/api/v1/nutrition/ingredients${buildQuery({
      q: params.q,
      category: params.category,
      page: params.page,
      per_page: params.per_page,
    })}`);
    return response.data;
  },
};
