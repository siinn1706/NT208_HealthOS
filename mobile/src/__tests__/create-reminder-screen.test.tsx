/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { CreateReminderScreen } from '../components/reminders/create-reminder-screen';
import { invalidateApiQuery } from '../api/query';
import { reminderService } from '../api/services';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
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

jest.mock('../api/services', () => ({
  reminderService: {
    create: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

const mockReminderCreate = reminderService.create as jest.MockedFunction<typeof reminderService.create>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockRouterBack = router.back as jest.MockedFunction<typeof router.back>;

describe('CreateReminderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReminderCreate.mockResolvedValue({
      id: 'rem-1',
      type: 'medicine',
      title: 'Morning dose',
      time: '07:30',
      repeat: 'weekly',
      note: 'With food',
      tzid: 'Asia/Ho_Chi_Minh',
      weekday_mask: 31,
    });
  });

  it('creates a Core-backed weekly medication reminder without unsupported categories or fake push data', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<CreateReminderScreen />);

    expect(queryByText('reminders.categoryVitals')).toBeNull();
    expect(queryByText('reminders.categoryGoal')).toBeNull();
    expect(queryByText('reminders.categoryCare')).toBeNull();
    expect(queryByText('reminders.snoozeOptions')).toBeNull();

    fireEvent.changeText(getByPlaceholderText('reminders.titlePlaceholder'), 'Morning dose');
    fireEvent.changeText(getByPlaceholderText('08:00'), '07:30');
    fireEvent.changeText(getByPlaceholderText('reminders.notesPlaceholder'), 'With food');
    fireEvent.press(getByText('common.save'));

    await waitFor(() => expect(mockReminderCreate).toHaveBeenCalledWith({
      type: 'medicine',
      title: 'Morning dose',
      time: '07:30',
      repeat: 'weekly',
      note: 'With food',
      weekday_mask: 31,
    }));
    expect(mockReminderCreate).not.toHaveBeenCalledWith(expect.objectContaining({
      note: expect.stringContaining('push:on'),
    }));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('reminders.');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('notifications.unread');
    expect(mockRouterBack).toHaveBeenCalled();
  });
});
