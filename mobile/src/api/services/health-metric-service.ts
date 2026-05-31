import { apiRequest } from '../client';

export type HealthMetricType =
  | 'heart_rate'
  | 'weight_kg'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic';

export interface HealthMetricCreateBody {
  metric_type: HealthMetricType;
  value: number;
  unit: string;
  recorded_at: string;
  source?: 'manual';
}

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  source: string;
}

export const healthMetricService = {
  async create(body: HealthMetricCreateBody) {
    return apiRequest<HealthMetric>('/v1/health-metrics', {
      method: 'POST',
      json: { source: 'manual', ...body },
    });
  },
};
