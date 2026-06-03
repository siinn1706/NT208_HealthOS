import { apiRequest, buildQuery } from '../client';
import type {
  Adherence,
  DataResponse,
  MedicationDose,
  MedicationDoseHistory,
  MedicationImportBody,
  MedicationImportResult,
  MedicationPauseBody,
  MedicationPlan,
  MedicationPlanCreateBody,
  MedicationPlanDetail,
} from '../../../../shared/api-contracts';

export const medicationService = {
  async list(status: MedicationPlan['status'] | 'all' = 'active') {
    const response = await apiRequest<DataResponse<MedicationPlan[]>>(`/api/v1/medications${buildQuery({ status })}`);
    return response.data;
  },

  async today(tzid?: string) {
    const response = await apiRequest<DataResponse<MedicationDose[]>>(`/api/v1/medications/today${buildQuery({ tzid })}`);
    return response.data;
  },

  async history(params: { from?: string; to?: string } = {}) {
    const response = await apiRequest<DataResponse<MedicationDoseHistory[]>>(`/api/v1/medications/history${buildQuery({
      from: params.from,
      to: params.to,
    })}`);
    return response.data;
  },

  async detail(id: string) {
    const response = await apiRequest<DataResponse<MedicationPlanDetail>>(`/api/v1/medications/${encodeURIComponent(id)}`);
    return response.data;
  },

  async adherence(id: string, period = '30d') {
    const response = await apiRequest<DataResponse<Adherence>>(`/api/v1/medications/${encodeURIComponent(id)}/adherence${buildQuery({ period })}`);
    return response.data;
  },

  async create(body: MedicationPlanCreateBody) {
    const response = await apiRequest<DataResponse<MedicationPlan>>('/api/v1/medications', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async update(id: string, body: Partial<MedicationPlanCreateBody>) {
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/api/v1/medications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },

  async pause(id: string, body?: MedicationPauseBody) {
    const init = body === undefined ? { method: 'POST' as const } : { method: 'POST' as const, json: body };
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/api/v1/medications/${encodeURIComponent(id)}/pause`, init);
    return response.data;
  },

  async resume(id: string) {
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/api/v1/medications/${encodeURIComponent(id)}/resume`, { method: 'POST' });
    return response.data;
  },

  async archive(id: string) {
    return apiRequest<void>(`/api/v1/medications/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async refill(id: string, supplyUnits: number) {
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/api/v1/medications/${encodeURIComponent(id)}/refill`, {
      method: 'POST',
      json: { supply_units: supplyUnits },
    });
    return response.data;
  },

  async importFromAppointment(
    appointmentId: string,
    body: MedicationImportBody = { default_dose_times: ['08:00'], default_repeat: 'daily' },
  ) {
    const response = await apiRequest<DataResponse<MedicationImportResult>>(`/api/v1/medications/import/${encodeURIComponent(appointmentId)}`, {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async markDoseDone(reminderId: string, occurrenceId?: string) {
    return apiRequest(`/api/v1/reminders/${encodeURIComponent(reminderId)}/done`, {
      method: 'POST',
      json: occurrenceId ? { occurrence_id: occurrenceId } : {},
    });
  },

  async skipDose(reminderId: string, occurrenceId?: string) {
    return apiRequest(`/api/v1/reminders/${encodeURIComponent(reminderId)}/skip`, {
      method: 'POST',
      json: occurrenceId ? { occurrence_id: occurrenceId } : {},
    });
  },
};
