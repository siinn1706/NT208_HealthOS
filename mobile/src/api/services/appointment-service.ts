import { apiRequest } from '../client';
import type { Appointment, AppointmentCreateBody, AppointmentUpdateBody, DataResponse, PaginatedResponse } from '../../../../shared/api-contracts';

export const appointmentService = {
  async list(params: { limit?: number; cursor?: string } = {}) {
    const { limit = 100, cursor } = params;
    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    if (cursor) qs.set('cursor', cursor);
    const response = await apiRequest<PaginatedResponse<Appointment>>(`/v1/appointments?${qs.toString()}`);
    return response.data;
  },

  async detail(id: string) {
    const response = await apiRequest<DataResponse<Appointment>>(`/v1/appointments/${encodeURIComponent(id)}`);
    return response.data;
  },

  async create(body: AppointmentCreateBody) {
    const response = await apiRequest<DataResponse<Appointment>>('/v1/appointments', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async update(id: string, body: AppointmentUpdateBody) {
    const response = await apiRequest<DataResponse<Appointment>>(`/v1/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },

  async updateStatus(id: string, status: Appointment['status']) {
    const response = await apiRequest<DataResponse<Appointment>>(`/v1/appointments/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      json: { status },
    });
    return response.data;
  },
};
