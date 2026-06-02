/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RemindersCenterScreen } from '../components/reminders/reminders-center-screen';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { reminderService } from '../api/services';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  notificationService: {
    unreadCount: jest.fn(),
  },
  reminderService: {
    list: jest.fn(),
    occurrences: jest.fn(),
    markDone: jest.fn(),
    snooze: jest.fn(),
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
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockReminderService = reminderService as jest.Mocked<typeof reminderService>;

const baseQueryState = {
  data: [],
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: true,
  reload: jest.fn(),
};
const remindersReload = jest.fn();
const occurrencesReload = jest.fn();

function mockQueries({
  reminders = [],
  occurrences = [],
}: {
  reminders?: unknown[];
  occurrences?: unknown[];
} = {}) {
  mockUseApiQuery.mockImplementation((key, loadFn) => {
    if (typeof loadFn === 'function') {
      void loadFn();
    }

    const text = String(key);
    if (text.startsWith('notifications.')) {
      return { ...baseQueryState, data: 0 } as never;
    }
    if (text.startsWith('reminders.occurrences.')) {
      return { ...baseQueryState, data: occurrences, reload: occurrencesReload, isEmpty: occurrences.length === 0 } as never;
    }
    return { ...baseQueryState, data: reminders, reload: remindersReload, isEmpty: reminders.length === 0 } as never;
  });
}

describe('RemindersCenterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    remindersReload.mockResolvedValue(undefined);
    occurrencesReload.mockResolvedValue(undefined);
    mockReminderService.markDone.mockResolvedValue({ id: 'occ-1' } as never);
    mockReminderService.snooze.mockResolvedValue({ id: 'occ-1' } as never);
    mockQueries();
  });

  it('uses visible filter chips instead of rendering a no-op filter button', () => {
    const { getByText, queryByLabelText } = render(<RemindersCenterScreen />);

    expect(queryByLabelText('common.filter')).toBeNull();

    fireEvent.press(getByText('reminders.filterMedication'));

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      'reminders.list.filterMedication',
      expect.any(Function),
    );
  });

  it('maps missing occurrence errors for mark-done into a localizable message', async () => {
    mockQueries({
      reminders: [{
        id: 'rem-1',
        title: 'Morning dose',
        type: 'medicine',
        repeat: 'daily',
        note: 'Take with food',
        done: false,
      }],
      occurrences: [{
        id: 'occ-1',
        reminder_id: 'rem-1',
        title: 'Morning dose',
        type: 'medicine',
        scheduled_at: new Date(Date.now() + 60_000).toISOString(),
        status: 'fired',
        snoozed_until: null,
      }],
    });
    mockReminderService.markDone.mockRejectedValueOnce({
      status: 404,
      code: 'NOT_FOUND',
      message: 'No matching occurrence',
    } as never);

    const { getByText, findByText } = render(<RemindersCenterScreen />);

    fireEvent.press(getByText('reminders.done'));

    expect(await findByText('reminders.reminderOccurrenceUnavailable')).toBeTruthy();
  });

  it('maps invalid snooze payload errors into a localizable message', async () => {
    mockQueries({
      reminders: [{
        id: 'rem-1',
        title: 'Morning dose',
        type: 'medicine',
        repeat: 'daily',
        note: 'Take with food',
        done: false,
      }],
      occurrences: [{
        id: 'occ-1',
        reminder_id: 'rem-1',
        title: 'Morning dose',
        type: 'medicine',
        scheduled_at: new Date(Date.now() + 60_000).toISOString(),
        status: 'fired',
        snoozed_until: null,
      }],
    });
    mockReminderService.snooze.mockRejectedValueOnce({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Provide either minutes or until is required',
    } as never);

    const { getByText, findByText } = render(<RemindersCenterScreen />);

    fireEvent.press(getByText('Snooze'));

    expect(await findByText('reminders.reminderSnoozePayloadInvalid')).toBeTruthy();
  });

  it('marks today medicine occurrences done and invalidates medication-derived caches', async () => {
    mockQueries({
      reminders: [{
        id: 'rem-1',
        title: 'Morning dose',
        type: 'medicine',
        repeat: 'daily',
        note: 'Take with food',
        done: false,
      }],
      occurrences: [{
        id: 'occ-1',
        reminder_id: 'rem-1',
        title: 'Morning dose',
        type: 'medicine',
        scheduled_at: new Date(Date.now() - 60_000).toISOString(),
        status: 'fired',
        snoozed_until: null,
      }],
    });
    const { getByText } = render(<RemindersCenterScreen />);

    fireEvent.press(getByText('reminders.resolve'));

    await waitFor(() => expect(mockReminderService.markDone).toHaveBeenCalledWith('rem-1', 'occ-1'));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('reminders.');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('medications.');
    expect(remindersReload).toHaveBeenCalled();
    expect(occurrencesReload).toHaveBeenCalled();
  });

  it('keeps skipped occurrences terminal without counting them as done', () => {
    mockQueries({
      occurrences: [{
        id: 'occ-skipped',
        reminder_id: 'rem-1',
        title: 'Morning dose',
        type: 'medicine',
        scheduled_at: new Date(Date.now() - 60_000).toISOString(),
        status: 'skipped',
        snoozed_until: null,
      }],
    });

    const { getByText, queryByText } = render(<RemindersCenterScreen />);

    expect(getByText('0 done · 0 left')).toBeTruthy();
    expect(getByText('Resolved today')).toBeTruthy();
    expect(getByText('Skipped')).toBeTruthy();
    expect(queryByText('reminders.doneToday')).toBeNull();
  });

  it('loads reminders occurrences with the device timezone', () => {
    const timezoneSpy = jest
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: 'America/Chicago' } as Intl.ResolvedDateTimeFormatOptions);

    try {
      render(<RemindersCenterScreen />);

      expect(mockReminderService.occurrences).toHaveBeenCalledWith(
        expect.objectContaining({
          today: true,
          tzid: 'America/Chicago',
          status: 'pending,fired,snoozed,done,skipped,missed',
        }),
      );
    } finally {
      timezoneSpy.mockRestore();
    }
  });
});
