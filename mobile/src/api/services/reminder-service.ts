import { apiRequest, buildQuery } from '../client';
import type {
  DataResponse,
  Reminder,
  ReminderCreateBody,
  ReminderOccurrence,
  ReminderType,
} from '../../../../shared/api-contracts';

export type ReminderOccurrenceAction = 'markDone' | 'snooze';
export type ReminderOccurrenceErrorKind = 'occurrenceMissing' | 'invalidSnoozePayload' | 'generic';

function errorText(error: unknown) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const message = (error as Record<string, unknown>).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

function includesLower(value: string, needle: string) {
  return value.toLowerCase().includes(needle);
}

function normalizedErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in (error as Record<string, unknown>)) {
    const code = (error as Record<string, unknown>).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

function statusCodeFromError(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in (error as Record<string, unknown>))) return null;
  const status = (error as Record<string, unknown>).status;
  if (typeof status === 'number' && Number.isFinite(status)) return status;
  if (typeof status === 'string' && status.trim() !== '') {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveReminderActionError(
  error: unknown,
  action: ReminderOccurrenceAction,
): ReminderOccurrenceErrorKind {
  const status = statusCodeFromError(error);
  const code = normalizedErrorCode(error);
  const message = errorText(error).toLowerCase();
  if (status === 404 || code === 'NOT_FOUND') {
    return 'occurrenceMissing';
  }
  if (action === 'snooze' && (status === 422 || code === 'VALIDATION_ERROR')) {
    return 'invalidSnoozePayload';
  }

  if (includesLower(message, 'no matching occurrence')) {
    return 'occurrenceMissing';
  }
  if (
    action === 'snooze' && (
      includesLower(message, 'provide either')
      || includesLower(message, 'provide only one')
      || includesLower(message, 'snooze requires')
    )
  ) {
    return 'invalidSnoozePayload';
  }

  return 'generic';
}

export const reminderService = {
  async list(type?: ReminderType) {
    const response = await apiRequest<DataResponse<Reminder[]>>(`/api/v1/reminders${buildQuery({ type })}`);
    return response.data;
  },

  async upcoming() {
    const response = await apiRequest<DataResponse<Reminder[]>>('/api/v1/reminders/upcoming');
    return response.data;
  },

  async create(body: ReminderCreateBody) {
    const response = await apiRequest<DataResponse<Reminder>>('/api/v1/reminders', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async updateDone(reminderId: string, done: boolean) {
    const response = await apiRequest<DataResponse<Reminder>>(`/api/v1/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'PATCH',
      json: { done },
    });
    return response.data;
  },

  async delete(reminderId: string) {
    return apiRequest<void>(`/api/v1/reminders/${encodeURIComponent(reminderId)}`, { method: 'DELETE' });
  },

  async occurrences(params: { from?: string; to?: string; today?: boolean; tzid?: string; status?: string } = {}) {
    const response = await apiRequest<DataResponse<ReminderOccurrence[]>>(`/api/v1/reminders/occurrences${buildQuery({
      from: params.from,
      to: params.to,
      today: params.today,
      tzid: params.tzid,
      status: params.status,
    })}`);
    return response.data;
  },

  async markDone(reminderId: string, occurrence_id?: string) {
    const response = await apiRequest<DataResponse<ReminderOccurrence>>(`/api/v1/reminders/${encodeURIComponent(reminderId)}/done`, {
      method: 'POST',
      json: occurrence_id ? { occurrence_id } : {},
    });
    return response.data;
  },

  async skip(reminderId: string, occurrence_id?: string) {
    const response = await apiRequest<DataResponse<ReminderOccurrence>>(`/api/v1/reminders/${encodeURIComponent(reminderId)}/skip`, {
      method: 'POST',
      json: occurrence_id ? { occurrence_id } : {},
    });
    return response.data;
  },

  async snooze(reminderId: string, body: { until?: string; minutes?: number; occurrence_id?: string }) {
    const response = await apiRequest<DataResponse<ReminderOccurrence>>(`/api/v1/reminders/${encodeURIComponent(reminderId)}/snooze`, {
      method: 'POST',
      json: body,
    });
    return response.data;
  },
};
