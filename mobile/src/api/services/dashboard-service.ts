import { apiRequest, buildQuery } from '../client';
import type { DashboardAiAdvice, DashboardSummary, DataResponse, Reminder, VitalPoint } from '../../../../shared/api-contracts';

export const dashboardService = {
  async summary() {
    const response = await apiRequest<DataResponse<DashboardSummary>>('/api/v1/dashboard/summary');
    return response.data;
  },

  async vitals(days = 7) {
    const response = await apiRequest<DataResponse<VitalPoint[]>>(`/api/v1/vitals/timeseries${buildQuery({ days })}`);
    return response.data;
  },

  async upcomingReminders() {
    const response = await apiRequest<DataResponse<Reminder[]>>('/api/v1/reminders/upcoming');
    return response.data;
  },

  async aiAdvice(locale: 'en' | 'vi') {
    const query = buildQuery({ surface: 'mobile', locale });
    const response = await apiRequest<DataResponse<DashboardAiAdvice>>(`/api/v1/dashboard/ai-advice${query}`);
    return response.data;
  },
};
