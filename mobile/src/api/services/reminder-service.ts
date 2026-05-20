import { apiRequest, buildQuery } from '../client';
import type { DataResponse, Reminder } from '../../../../shared/api-contracts';

type OccurrenceResult = {
  id: string;
  reminder_id: string;
  title: string;
  type: string;
  scheduled_at: string;
  status: string;
  snoozed_until?: string | null;
  done_at?: string | null;
  skipped_at?: string | null;
};

export const reminderService = {
  async list(type?: 'medicine' | 'appointment' | 'exercise') {
    const response = await apiRequest<DataResponse<Reminder[]>>(`/v1/reminders${buildQuery({ type })}`);
    return response.data;
  },

  async upcoming() {
    const response = await apiRequest<DataResponse<Reminder[]>>('/v1/reminders/upcoming');
    return response.data;
  },

  async create(body: {
    type: 'medicine' | 'appointment' | 'exercise';
    title: string;
    time: string;
    repeat?: 'once' | 'daily' | 'weekly' | 'monthly';
    note?: string;
    tzid?: string;
    weekday_mask?: number;
    day_of_month?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const response = await apiRequest<DataResponse<Reminder>>('/v1/reminders', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async updateDone(reminderId: string, done: boolean) {
    const response = await apiRequest<DataResponse<Reminder>>(`/v1/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'PATCH',
      json: { done },
    });
    return response.data;
  },

  async delete(reminderId: string) {
    return apiRequest<void>(`/v1/reminders/${encodeURIComponent(reminderId)}`, { method: 'DELETE' });
  },

  async occurrences(params: { from?: string; to?: string; today?: boolean; tzid?: string; status?: string } = {}) {
    const response = await apiRequest<DataResponse<OccurrenceResult[]>>(`/v1/reminders/occurrences${buildQuery({
      from: params.from,
      to: params.to,
      today: params.today,
      tzid: params.tzid,
      status: params.status,
    })}`);
    return response.data;
  },

  async markDone(reminderId: string, occurrence_id?: string) {
    const response = await apiRequest<DataResponse<OccurrenceResult>>(`/v1/reminders/${encodeURIComponent(reminderId)}/done`, {
      method: 'POST',
      json: occurrence_id ? { occurrence_id } : {},
    });
    return response.data;
  },

  async skip(reminderId: string, occurrence_id?: string) {
    const response = await apiRequest<DataResponse<OccurrenceResult>>(`/v1/reminders/${encodeURIComponent(reminderId)}/skip`, {
      method: 'POST',
      json: occurrence_id ? { occurrence_id } : {},
    });
    return response.data;
  },

  async snooze(reminderId: string, body: { until?: string; minutes?: number; occurrence_id?: string }) {
    const response = await apiRequest<DataResponse<OccurrenceResult & { snoozed_until?: string | null }>>(`/v1/reminders/${encodeURIComponent(reminderId)}/snooze`, {
      method: 'POST',
      json: body,
    });
    return response.data;
  },
};
