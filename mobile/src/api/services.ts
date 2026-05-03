import { apiRequest, buildQuery } from './client';
import { clearStoredSession, saveAuthToken } from '../auth/session-store';
import type {
  Adherence,
  Appointment,
  AppointmentCreateBody,
  AppointmentUpdateBody,
  AuthToken,
  CalorieSummaryPoint,
  Conversation,
  CurrentUser,
  HealthGoal,
  HealthReport,
  DashboardSummary,
  DataResponse,
  MedicationDose,
  MedicationPlan,
  MedicationPlanCreateBody,
  MedicationPlanDetail,
  Meal,
  MealIngredient,
  NotificationItem,
  NotificationListData,
  NotificationPreferences,
  NutritionSuggestion,
  Message,
  MessageListResponse,
  PaginatedResponse,
  Reminder,
  ReportExportDownload,
  ReportExportRequest,
  RiskSummary,
  TrendAnalysis,
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

  async detail(id: string) {
    const response = await apiRequest<DataResponse<Appointment>>(`/v1/appointments/${id}`);
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
    const response = await apiRequest<DataResponse<Appointment>>(`/v1/appointments/${id}`, {
      method: 'PATCH',
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

  async createAiConversation(initialMessage?: string) {
    const response = await apiRequest<DataResponse<Conversation>>('/v1/conversations/ai', {
      method: 'POST',
      json: initialMessage ? { initial_message: initialMessage } : undefined,
    });
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
  async list(params?: { cursor?: string; per_page?: number; only_unread?: boolean }) {
    const response = await apiRequest<NotificationListData>(`/v1/notifications${buildQuery({
      cursor: params?.cursor,
      per_page: params?.per_page,
      only_unread: params?.only_unread,
    })}`);
    return response;
  },

  async unreadCount() {
    const response = await apiRequest<DataResponse<{ unread: number }>>('/v1/notifications/unread-count');
    return response.data.unread;
  },

  async markRead(id: string) {
    const response = await apiRequest<DataResponse<NotificationItem>>(`/v1/notifications/${id}/read`, {
      method: 'POST',
    });
    return response.data;
  },

  async markAllRead() {
    const response = await apiRequest<DataResponse<{ marked: number }>>('/v1/notifications/read-all', {
      method: 'POST',
    });
    return response.data.marked;
  },

  async preferences() {
    const response = await apiRequest<DataResponse<NotificationPreferences>>('/v1/notifications/preferences');
    return response.data;
  },

  async updatePreferences(body: Partial<NotificationPreferences>) {
    const response = await apiRequest<DataResponse<NotificationPreferences>>('/v1/notifications/preferences', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },
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
    const response = await apiRequest<DataResponse<Reminder>>(`/v1/reminders/${reminderId}`, {
      method: 'PATCH',
      json: { done },
    });
    return response.data;
  },

  async delete(reminderId: string) {
    return apiRequest<void>(`/v1/reminders/${reminderId}`, { method: 'DELETE' });
  },

  async occurrences(params: { from?: string; to?: string; today?: boolean; tzid?: string; status?: string } = {}) {
    const response = await apiRequest<
      DataResponse<
        {
          id: string;
          reminder_id: string;
          title: string;
          type: string;
          scheduled_at: string;
          status: string;
          snoozed_until?: string | null;
          done_at?: string | null;
          skipped_at?: string | null;
        }[]
      >
    >(`/v1/reminders/occurrences${buildQuery({
      from: params.from,
      to: params.to,
      today: params.today,
      tzid: params.tzid,
      status: params.status,
    })}`);
    return response.data;
  },

  async markDone(reminderId: string, occurrence_id?: string) {
    const response = await apiRequest<
      DataResponse<{
        id: string;
        reminder_id: string;
        title: string;
        type: string;
        scheduled_at: string;
        status: string;
      }>
    >(`/v1/reminders/${reminderId}/done`, {
      method: 'POST',
      json: occurrence_id ? { occurrence_id } : {},
    });
    return response.data;
  },

  async skip(reminderId: string, occurrence_id?: string) {
    const response = await apiRequest<
      DataResponse<{
        id: string;
        reminder_id: string;
        title: string;
        type: string;
        scheduled_at: string;
        status: string;
      }>
    >(`/v1/reminders/${reminderId}/skip`, {
      method: 'POST',
      json: occurrence_id ? { occurrence_id } : {},
    });
    return response.data;
  },

  async snooze(reminderId: string, body: { until?: string; minutes?: number; occurrence_id?: string }) {
    const response = await apiRequest<
      DataResponse<{
        id: string;
        reminder_id: string;
        title: string;
        type: string;
        scheduled_at: string;
        status: string;
        snoozed_until?: string | null;
      }>
    >(`/v1/reminders/${reminderId}/snooze`, {
      method: 'POST',
      json: body,
    });
    return response.data;
  },
};

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

export const mealService = {
  async list(params: { page?: number; per_page?: number; date_from?: string; date_to?: string } = {}) {
    const response = await apiRequest<PaginatedResponse<Meal>>(`/v1/meals${buildQuery({
      page: params.page,
      per_page: params.per_page,
      date_from: params.date_from,
      date_to: params.date_to,
    })}`);
    return response.data;
  },

  async detail(id: string) {
    const response = await apiRequest<DataResponse<Meal>>(`/v1/meals/${id}`);
    return response.data;
  },

  async update(id: string, body: { name?: string; logged_at?: string }) {
    const response = await apiRequest<DataResponse<Meal>>(`/v1/meals/${id}`, {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },

  async ingredients(id: string) {
    const response = await apiRequest<DataResponse<MealIngredient[]>>(`/v1/meals/${id}/ingredients`);
    return response.data;
  },

  async caloriesSummary(date_from: string, date_to: string) {
    const response = await apiRequest<DataResponse<CalorieSummaryPoint[]>>(`/v1/meals/calories-summary${buildQuery({
      date_from,
      date_to,
    })}`);
    return response.data;
  },
};

export const nutritionService = {
  async suggestions() {
    const response = await apiRequest<DataResponse<NutritionSuggestion[]>>('/v1/nutrition/suggestions');
    return response.data;
  },
};

export const reportService = {
  async get(period: '7d' | '30d' | '90d' = '7d') {
    const response = await apiRequest<DataResponse<HealthReport>>(`/v1/reports${buildQuery({ period })}`);
    return response.data;
  },

  async trends(metric: string, period: '7d' | '30d' | '90d' = '7d') {
    const response = await apiRequest<DataResponse<TrendAnalysis>>(`/v1/reports/trends${buildQuery({ metric, period })}`);
    return response.data;
  },

  async requestPdf(body: {
    period: '7d' | '30d' | '90d';
    sections: string[];
    locale?: 'en' | 'vi';
    include_sensitive?: boolean;
  }) {
    const response = await apiRequest<DataResponse<ReportExportRequest>>('/v1/reports/export-pdf', {
      method: 'POST',
      json: body,
    });
    return response.data;
  },

  async pdfStatus(requestId: string) {
    const response = await apiRequest<DataResponse<ReportExportRequest>>(`/v1/reports/export-pdf/${requestId}`);
    return response.data;
  },

  async pdfDownload(requestId: string) {
    const response = await apiRequest<DataResponse<ReportExportDownload>>(`/v1/reports/export-pdf/${requestId}/download`);
    return response.data;
  },
};

export const riskService = {
  async summary() {
    const response = await apiRequest<DataResponse<RiskSummary>>('/v1/health/risk-predictions');
    return response.data;
  },

  async refresh() {
    const response = await apiRequest<DataResponse<RiskSummary>>('/v1/health/risk-predictions', {
      method: 'POST',
    });
    return response.data;
  },
};

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
