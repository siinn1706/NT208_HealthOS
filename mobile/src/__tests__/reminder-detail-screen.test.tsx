/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ReminderDetailScreen } from '../components/reminders/reminder-detail-screen';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { reminderService } from '../api/services';
import type { Reminder, ReminderOccurrence } from '../../../shared/api-contracts';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../components/primitives/sheet/bottom-sheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
    visible ? children : null
  ),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  reminderService: {
    delete: jest.fn(),
    list: jest.fn(),
    markDone: jest.fn(),
    occurrences: jest.fn(),
    skip: jest.fn(),
    snooze: jest.fn(),
  },
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockReminderService = reminderService as jest.Mocked<typeof reminderService>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;
const mockRouterReplace = router.replace as jest.MockedFunction<typeof router.replace>;

const reminderReload = jest.fn();
const occurrenceReload = jest.fn();

const reminder: Reminder = {
  id: 'rem-1',
  title: 'Morning dose',
  type: 'medicine',
  time: '08:00',
  repeat: 'daily',
  note: null,
  tzid: 'Asia/Ho_Chi_Minh',
  weekday_mask: null,
  day_of_month: null,
  due_at: null,
  next_occurrence_at: null,
  done: false,
  medication_plan_id: 'med-1',
};

const pendingOccurrence: ReminderOccurrence = {
  id: 'occ-1',
  reminder_id: 'rem-1',
  title: 'Morning dose',
  type: 'medicine',
  scheduled_at: new Date(Date.now() - 60_000).toISOString(),
  status: 'pending',
  snoozed_until: null,
  done_at: null,
  skipped_at: null,
};

function renderDetail({
  occurrences = [pendingOccurrence],
}: {
  occurrences?: ReminderOccurrence[];
} = {}) {
  mockUseLocalSearchParams.mockReturnValue({ id: 'rem-1' });
  reminderReload.mockResolvedValue(undefined);
  occurrenceReload.mockResolvedValue(undefined);
  mockUseApiQuery.mockImplementation((key) => {
    if (String(key).startsWith('reminders.occurrences.')) {
      return {
        data: occurrences,
        error: null,
        isLoading: false,
        isRefreshing: false,
        isEmpty: false,
        reload: occurrenceReload,
      } as never;
    }
    return {
      data: [reminder],
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: false,
      reload: reminderReload,
    } as never;
  });
  mockReminderService.skip.mockResolvedValue(pendingOccurrence);
  mockReminderService.snooze.mockResolvedValue(pendingOccurrence);
  mockReminderService.markDone.mockResolvedValue(pendingOccurrence);
  mockReminderService.delete.mockResolvedValue(undefined);
  return render(<ReminderDetailScreen />);
}

describe('ReminderDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes notification preferences and removes unsupported custom/no-op controls', () => {
    const { getByText, queryByText } = renderDetail();

    expect(queryByText('Custom time')).toBeNull();
    expect(queryByText('Until 12:45')).toBeNull();
    fireEvent.press(getByText('Notification preferences'));

    expect(mockRouterPush).toHaveBeenCalledWith('/reminders/preferences');
  });

  it('skips the next pending occurrence and reloads reminders', async () => {
    const { getByText } = renderDetail();

    fireEvent.press(getByText('meds.missed'));
    fireEvent.press(getByText('Skip dose'));

    await waitFor(() => expect(mockReminderService.skip).toHaveBeenCalledWith('rem-1', 'occ-1'));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('reminders.');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('medications.');
    expect(reminderReload).toHaveBeenCalled();
    expect(occurrenceReload).toHaveBeenCalled();
  });

  it('does not send explicit skipped occurrence ids back to Core actions', async () => {
    const skippedOccurrence = { ...pendingOccurrence, status: 'skipped' };
    const { getByText } = renderDetail({ occurrences: [skippedOccurrence] });

    fireEvent.press(getByText('meds.missed'));
    fireEvent.press(getByText('Skip dose'));

    await waitFor(() => expect(mockReminderService.skip).toHaveBeenCalledWith('rem-1', undefined));
  });

  it('uses today occurrence status instead of an older completed occurrence for the hero chip', () => {
    const olderDone = {
      ...pendingOccurrence,
      id: 'occ-old',
      scheduled_at: new Date(Date.now() - 86_400_000).toISOString(),
      status: 'done',
    };
    const todayDue = { ...pendingOccurrence, status: 'fired' };
    const { getByText, queryByText } = renderDetail({ occurrences: [olderDone, todayDue] });

    expect(getByText('Due')).toBeTruthy();
    expect(queryByText('Done')).toBeNull();
  });

  it('deletes the reminder through Core and returns to the reminders hub', async () => {
    const { getByText } = renderDetail();

    fireEvent.press(getByText('Delete Reminder'));

    await waitFor(() => expect(mockReminderService.delete).toHaveBeenCalledWith('rem-1'));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('reminders.');
    expect(mockRouterReplace).toHaveBeenCalledWith('/reminders');
  });
});
