import { apiRequest, buildQuery } from '../client';
import type { DataResponse, HealthGoal } from '../../../../shared/api-contracts';

export type GoalProgressPeriod = '7d' | '30d' | '90d';

export interface GoalProgressPoint {
  date: string;
  value: number;
  target: number;
  progress_percent: number | null;
}

export const healthGoalService = {
  async current() {
    const response = await apiRequest<DataResponse<HealthGoal | null>>('/api/v1/health-goals');
    return response.data;
  },

  async upsert(body: { target_weight_kg: number; deadline?: string | null }) {
    const response = await apiRequest<DataResponse<HealthGoal>>('/api/v1/health-goals', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async progress(params: { metric: 'weight_kg'; target: number; period?: GoalProgressPeriod }) {
    const response = await apiRequest<DataResponse<GoalProgressPoint[]>>(`/api/v1/goals/progress${buildQuery({
      metric: params.metric,
      target: params.target,
      period: params.period ?? '7d',
    })}`);
    return response.data;
  },
};
