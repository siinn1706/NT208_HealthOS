/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { NotificationsInboxScreen } from '../components/reminders/notifications-inbox-screen';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { notificationService } from '../api/services';
import type { NotificationItem } from '../../../shared/api-contracts';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  notificationService: {
    list: jest.fn(),
    markAllRead: jest.fn(),
    markRead: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'api.loading': 'Loading',
        'api.unavailable': 'Unavailable',
        'common.retry': 'Retry',
        'reminders.notificationInbox': 'Notifications',
        'reminders.noReminders': 'No reminders',
        'reminders.newReminder': 'New',
        'reminders.today': 'Today',
        'reminders.unread': 'unread',
        'reminders.markAllRead': 'Mark all read',
        'reminders.notificationActionFailed': 'Could not update notification.',
      };
      return labels[key] ?? key;
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;

const queryReload = jest.fn();

function notification(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'notif-1',
    title: 'Morning dose',
    body: 'Take lisinopril after breakfast.',
    kind: 'reminder',
    reference_id: 'plan-1',
    link: '/dashboard/medications/plan-1',
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderInbox(items: NotificationItem[]) {
  mockUseApiQuery.mockReturnValue({
    data: {
      data: items,
      meta: { next_cursor: null, has_more: false, per_page: 100 },
    },
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: items.length === 0,
    reload: queryReload,
  } as never);

  return render(<NotificationsInboxScreen />);
}

describe('NotificationsInboxScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryReload.mockClear();
    mockNotificationService.markRead.mockResolvedValue(notification({ is_read: true }));
    mockNotificationService.markAllRead.mockResolvedValue(1);
  });

  it('opens known backend medication links as native routes after marking the item read', async () => {
    const item = notification({});
    const { getByText, queryByText } = renderInbox([
      item,
      notification({ id: 'notif-2', title: 'Care message', body: 'New message from care team.', kind: 'care_message', link: '/chat' }),
    ]);

    expect(queryByText('Take')).toBeNull();
    expect(queryByText('Skip')).toBeNull();
    expect(queryByText('Reply')).toBeNull();
    expect(queryByText('View')).toBeNull();
    expect(queryByText(/all caught up tomorrow/i)).toBeNull();

    fireEvent.press(getByText('Morning dose'));

    await waitFor(() => expect(mockNotificationService.markRead).toHaveBeenCalledWith(item.id));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('notifications.');
    expect(queryReload).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/meds/plan-1');
  });

  it('maps backend reminder links to the native reminders hub', async () => {
    const item = notification({ link: '/dashboard/reminders?occurrence=occ-1' });
    const { getByText } = renderInbox([item]);

    fireEvent.press(getByText('Morning dose'));

    await waitFor(() => expect(mockNotificationService.markRead).toHaveBeenCalledWith(item.id));
    expect(mockRouterPush).toHaveBeenCalledWith('/reminders');
  });

  it('keeps backend reminder kinds in the Reminders tab', () => {
    const { getByText, queryByText } = renderInbox([
      notification({}),
      notification({
        id: 'notif-2',
        title: 'Export ready',
        body: 'Your archive is ready.',
        kind: 'data_export',
        reference_id: 'export-1',
        link: '/dashboard/settings?export=export-1',
      }),
    ]);

    fireEvent.press(getByText('Reminders'));

    expect(getByText('Morning dose')).toBeTruthy();
    expect(queryByText('Export ready')).toBeNull();
  });

  it('marks unsafe notification links read without routing outside the app', async () => {
    const item = notification({ link: 'https://example.test/unsafe' });
    const { getByText } = renderInbox([item]);

    fireEvent.press(getByText('Morning dose'));

    await waitFor(() => expect(mockNotificationService.markRead).toHaveBeenCalledWith(item.id));
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not route unknown dashboard links to unmatched native paths', async () => {
    const item = notification({ link: '/dashboard/unknown-place' });
    const { getByText } = renderInbox([item]);

    fireEvent.press(getByText('Morning dose'));

    await waitFor(() => expect(mockNotificationService.markRead).toHaveBeenCalledWith(item.id));
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('shows mark-read failures and still opens safe notification targets', async () => {
    mockNotificationService.markRead.mockRejectedValueOnce(new Error('Network failed'));
    const item = notification({});
    const { getByText } = renderInbox([item]);

    fireEvent.press(getByText('Morning dose'));

    await waitFor(() => expect(getByText('Network failed')).toBeTruthy());
    expect(mockRouterPush).toHaveBeenCalledWith('/meds/plan-1');
  });

  it('shows mark-all-read failures without unhandled touch errors', async () => {
    mockNotificationService.markAllRead.mockRejectedValueOnce(new Error('Read-all failed'));
    const { getByLabelText, getByText } = renderInbox([notification({})]);

    fireEvent.press(getByLabelText('Mark all read'));

    await waitFor(() => expect(getByText('Read-all failed')).toBeTruthy());
    expect(mockInvalidateApiQuery).not.toHaveBeenCalled();
  });
});
