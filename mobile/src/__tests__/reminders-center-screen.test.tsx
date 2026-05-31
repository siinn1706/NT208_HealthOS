/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RemindersCenterScreen } from '../components/reminders/reminders-center-screen';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
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

const baseQueryState = {
  data: [],
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: true,
  reload: jest.fn(),
};

describe('RemindersCenterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockImplementation((key) => ({
      ...baseQueryState,
      data: String(key).startsWith('notifications.') ? 0 : [],
    }) as never);
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
});
