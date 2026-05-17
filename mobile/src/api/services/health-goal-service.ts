import { apiRequest } from '../client';
import type { DataResponse, HealthGoal } from '../../../../shared/api-contracts';

export const healthGoalService = {
  async current() {
    const response = await apiRequest<DataResponse<HealthGoal | null>>('/v1/health-goals');
    return response.data;
  },

  async upsert(body: { target_weight_kg: number; deadline?: string | null }) {
    const response = await apiRequest<DataResponse<HealthGoal>>('/v1/health-goals', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },
};
