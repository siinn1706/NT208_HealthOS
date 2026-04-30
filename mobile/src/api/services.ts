import { apiRequest, buildQuery } from './client';
import { clearStoredSession, saveAuthToken } from '../auth/session-store';
import type {
  Adherence,
  Appointment,
  AppointmentCreateBody,
  AuthToken,
  Conversation,
  CurrentUser,
  DashboardSummary,
  DataResponse,
  MedicationDose,
  MedicationPlan,
  MedicationPlanCreateBody,
  MedicationPlanDetail,
  Message,
  MessageListResponse,
  Notification,
  PaginatedResponse,
  Reminder,
  UserPreference,
  UserProfileUpdate,
  VitalPoint,
} from '../../../shared/api-contracts';

export const authService = {
  async login(identifier: string, password: string) {
    const response = await apiRequest<DataResponse<AuthToken>>('/v1/auth/login', {
      method: 'POST',
      auth: false,
      json: { identifier, password },
    });
    await saveAuthToken(response.data);
    return response.data;
  },

  async requestOtp(body: {
    email: string;
    purpose: 'signup' | 'reset_password' | 'login';
    name?: string;
    username?: string;
    password?: string;
  }) {
    return apiRequest<DataResponse<{ delivery: 'email'; expires_in_seconds: number; otp?: string }>>('/v1/auth/request-otp', {
      method: 'POST',
      auth: false,
      json: body,
    });
  },

  async verifyOtp(body: {
    email: string;
    purpose: 'signup' | 'reset_password' | 'login';
    code: string;
    password?: string;
  }) {
    const response = await apiRequest<DataResponse<AuthToken | { email: string; next_step: string }>>('/v1/auth/verify-otp', {
      method: 'POST',
      auth: false,
      json: body,
    });
    if ('access_token' in response.data) {
      await saveAuthToken(response.data);
    }
    return response.data;
  },

  async resetPassword(email: string, newPassword: string) {
    const response = await apiRequest<DataResponse<AuthToken>>('/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      json: { email, new_password: newPassword },
    });
    await saveAuthToken(response.data);
    return response.data;
  },

  async logout() {
    try {
      await apiRequest('/v1/auth/logout', { method: 'POST' });
    } finally {
      await clearStoredSession();
    }
  },
};

export const profileService = {
  async me() {
    const response = await apiRequest<DataResponse<CurrentUser>>('/v1/users/me');
    return response.data;
  },

  async updateMe(body: UserProfileUpdate) {
    const response = await apiRequest<DataResponse<CurrentUser>>('/v1/users/me', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },
};

export const preferenceService = {
  async me() {
    const response = await apiRequest<DataResponse<UserPreference>>('/v1/preferences/me');
    return response.data;
  },

  async update(body: Partial<UserPreference>) {
    const response = await apiRequest<DataResponse<UserPreference>>('/v1/preferences/me', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },
};

export const dashboardService = {
  async summary() {
    const response = await apiRequest<DataResponse<DashboardSummary>>('/v1/dashboard/summary');
    return response.data;
  },

  async vitals(days = 7) {
    const response = await apiRequest<DataResponse<VitalPoint[]>>(`/v1/vitals/timeseries${buildQuery({ days })}`);
    return response.data;
  },

  async upcomingReminders() {
    const response = await apiRequest<DataResponse<Reminder[]>>('/v1/reminders/upcoming');
    return response.data;
  },
};

export const appointmentService = {
  async list() {
    const response = await apiRequest<PaginatedResponse<Appointment>>('/v1/appointments?limit=100');
    return response.data;
  },

  async create(body: AppointmentCreateBody) {
    const response = await apiRequest<DataResponse<Appointment>>('/v1/appointments', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async updateStatus(id: string, status: Appointment['status']) {
    const response = await apiRequest<DataResponse<Appointment>>(`/v1/appointments/${id}/status`, {
      method: 'PATCH',
      json: { status },
    });
    return response.data;
  },
};

export const medicationService = {
  async list(status: MedicationPlan['status'] | 'all' = 'active') {
    const response = await apiRequest<DataResponse<MedicationPlan[]>>(`/v1/medications${buildQuery({ status })}`);
    return response.data;
  },

  async today(tzid?: string) {
    const response = await apiRequest<DataResponse<MedicationDose[]>>(`/v1/medications/today${buildQuery({ tzid })}`);
    return response.data;
  },

  async detail(id: string) {
    const response = await apiRequest<DataResponse<MedicationPlanDetail>>(`/v1/medications/${id}`);
    return response.data;
  },

  async adherence(id: string, period = '30d') {
    const response = await apiRequest<DataResponse<Adherence>>(`/v1/medications/${id}/adherence${buildQuery({ period })}`);
    return response.data;
  },

  async create(body: MedicationPlanCreateBody) {
    const response = await apiRequest<DataResponse<MedicationPlan>>('/v1/medications', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async update(id: string, body: Partial<MedicationPlanCreateBody>) {
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/v1/medications/${id}`, {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },

  async pause(id: string) {
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/v1/medications/${id}/pause`, { method: 'POST' });
    return response.data;
  },

  async resume(id: string) {
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/v1/medications/${id}/resume`, { method: 'POST' });
    return response.data;
  },

  async archive(id: string) {
    return apiRequest<void>(`/v1/medications/${id}`, { method: 'DELETE' });
  },

  async refill(id: string, supplyUnits: number) {
    const response = await apiRequest<DataResponse<MedicationPlan>>(`/v1/medications/${id}/refill`, {
      method: 'POST',
      json: { supply_units: supplyUnits },
    });
    return response.data;
  },

  async importFromAppointment(appointmentId: string) {
    return apiRequest(`/v1/medications/import/${appointmentId}`, {
      method: 'POST',
      json: { default_dose_times: ['08:00'], default_repeat: 'daily' },
    });
  },

  async markDoseDone(reminderId: string, occurrenceId?: string) {
    return apiRequest(`/v1/reminders/${reminderId}/done`, {
      method: 'POST',
      json: occurrenceId ? { occurrence_id: occurrenceId } : {},
    });
  },

  async skipDose(reminderId: string, occurrenceId?: string) {
    return apiRequest(`/v1/reminders/${reminderId}/skip`, {
      method: 'POST',
      json: occurrenceId ? { occurrence_id: occurrenceId } : {},
    });
  },
};

export const chatService = {
  async conversations() {
    const response = await apiRequest<{ data: Conversation[]; total: number }>('/v1/conversations');
    return response.data;
  },

  async conversation(id: string) {
    const response = await apiRequest<DataResponse<Conversation>>(`/v1/conversations/${id}`);
    return response.data;
  },

  async messages(conversationId: string) {
    const response = await apiRequest<MessageListResponse>(`/v1/conversations/${conversationId}/messages?limit=50`);
    return response.data.slice().reverse();
  },

  async sendMessage(conversationId: string, content: string) {
    const response = await apiRequest<DataResponse<Message>>(`/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      json: {
        content,
        content_type: 'text',
        client_message_id: `mobile-${Date.now()}`,
      },
    });
    return response.data;
  },
};

export const notificationService = {
  async list() {
    const response = await apiRequest<DataResponse<Notification[]>>('/v1/notifications');
    return response.data;
  },
};
