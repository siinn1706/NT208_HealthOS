/* eslint-env jest */
import { notificationService } from '../api/services/notification-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: (params: Record<string, string | number | boolean | null | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) qs.set(key, String(value));
    });
    const text = qs.toString();
    return text ? `?${text}` : '';
  },
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('notificationService', () => {
  it('lists notifications with cursor, page size, and unread filters', async () => {
    const listResponse = { data: [], meta: { next_cursor: null, has_more: false, per_page: 50 } };
    mockApiRequest.mockResolvedValueOnce(listResponse as never);

    await expect(notificationService.list({
      cursor: 'next',
      per_page: 50,
      only_unread: true,
    })).resolves.toBe(listResponse);

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/api/v1/notifications?cursor=next&per_page=50&only_unread=true',
    );
  });

  it('reads unread counts from the Core data envelope', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { unread: 3 } } as never);

    await expect(notificationService.unreadCount()).resolves.toBe(3);

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/notifications/unread-count');
  });

  it('marks one notification read through an encoded id', async () => {
    const item = { id: 'notif/1', title: 'Dose', body: 'Take it', kind: 'reminder' };
    mockApiRequest.mockResolvedValueOnce({ data: item } as never);

    await expect(notificationService.markRead('notif/1')).resolves.toBe(item);

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/notifications/notif%2F1/read', {
      method: 'POST',
    });
  });

  it('marks all notifications read and returns the count', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { marked: 4 } } as never);

    await expect(notificationService.markAllRead()).resolves.toBe(4);

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/notifications/read-all', {
      method: 'POST',
    });
  });

  it('loads and updates notification preferences', async () => {
    const preferences = {
      enabled: true,
      channels: { push: true, sound: true, haptics: true },
      categories: { med: true, appt: true, vitals: true, activity: true, goal: true },
      quiet_hours: { start: '22:00', end: '06:00' },
      critical_bypass: false,
      snooze_options: [5, 15],
    };
    mockApiRequest.mockResolvedValue({ data: preferences } as never);

    await expect(notificationService.preferences()).resolves.toBe(preferences);
    await expect(notificationService.updatePreferences({ enabled: false })).resolves.toBe(preferences);

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/api/v1/notifications/preferences');
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/api/v1/notifications/preferences', {
      method: 'PATCH',
      json: { enabled: false },
    });
  });
});
