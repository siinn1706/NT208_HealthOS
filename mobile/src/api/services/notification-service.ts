import { apiRequest, buildQuery } from '../client';
import type { DataResponse, NotificationItem, NotificationListData, NotificationPreferences } from '../../../../shared/api-contracts';

export const notificationService = {
  async list(params?: { cursor?: string; per_page?: number; only_unread?: boolean }) {
    const response = await apiRequest<NotificationListData>(`/api/v1/notifications${buildQuery({
      cursor: params?.cursor,
      per_page: params?.per_page,
      only_unread: params?.only_unread,
    })}`);
    return response;
  },

  async unreadCount() {
    const response = await apiRequest<DataResponse<{ unread: number }>>('/api/v1/notifications/unread-count');
    return response.data.unread;
  },

  async markRead(id: string) {
    const response = await apiRequest<DataResponse<NotificationItem>>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    });
    return response.data;
  },

  async markAllRead() {
    const response = await apiRequest<DataResponse<{ marked: number }>>('/api/v1/notifications/read-all', {
      method: 'POST',
    });
    return response.data.marked;
  },

  async preferences() {
    const response = await apiRequest<DataResponse<NotificationPreferences>>('/api/v1/notifications/preferences');
    return response.data;
  },

  async updatePreferences(body: Partial<NotificationPreferences>) {
    const response = await apiRequest<DataResponse<NotificationPreferences>>('/api/v1/notifications/preferences', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },
};
