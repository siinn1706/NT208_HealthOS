import { apiRequest } from '../client';
import type { DataResponse } from '../../../../shared/api-contracts';

export const visitBriefService = {
  async create(body: {
    visit_type?: 'gp_routine' | 'specialist' | 'follow_up' | 'mental_health' | 'urgent_walkin' | 'pediatric_caregiver';
    title?: string;
    attach_to_appointment_id?: string;
  }) {
    const response = await apiRequest<DataResponse<{ id: string }>>('/v1/visit-briefs', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async addSymptom(
    briefId: string,
    body: {
      concern_text: string;
      concern_category?: 'pain' | 'fever' | 'gi' | 'resp' | 'mental' | 'skin' | 'neuro' | 'cardio' | 'other';
      severity_0_10?: number;
      context?: Record<string, unknown>;
    },
  ) {
    const response = await apiRequest<DataResponse<{ id: string }>>(`/v1/visit-briefs/${briefId}/symptoms`, {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async routeNow(briefId: string) {
    const response = await apiRequest<DataResponse<{ bucket: string; next_action_copy_key?: string | null }>>(
      `/v1/visit-briefs/${briefId}/route-now`,
      { method: 'POST' },
    );
    return response.data;
  },
};
