import { apiRequest, buildQuery } from '../client';
import type { DashboardSummary, DataResponse, Reminder, VitalPoint } from '../../../../shared/api-contracts';

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
