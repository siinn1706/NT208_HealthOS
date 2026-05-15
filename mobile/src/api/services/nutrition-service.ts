import { apiRequest } from '../client';
import type { DataResponse, NutritionSuggestion } from '../../../../shared/api-contracts';

export const nutritionService = {
  async suggestions() {
    const response = await apiRequest<DataResponse<NutritionSuggestion[]>>('/v1/nutrition/suggestions');
    return response.data;
  },
};
