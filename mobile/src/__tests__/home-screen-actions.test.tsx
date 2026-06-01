/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import HomeScreen from '../../app/(tabs)/home';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    user: {
      display_name: 'Test User',
    },
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../hooks/use-greeting', () => ({
  useGreetingTitle: () => 'Good morning',
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'home.searchAccessibility': 'Search',
      'home.notificationsAccessibility': 'Notifications',
      'home.noDashboardData': 'No dashboard data',
      'home.dashboardEmptyMessage': 'Dashboard empty',
      'home.quickActions': 'Quick actions',
      'home.quickActionMeal': 'Meal',
      'home.quickActionVitals': 'Vitals',
      'home.quickActionAi': 'AI',
      'home.quickActionInsights': 'Insights',
    }[key] ?? key),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children?: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;

describe('HomeScreen top actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: false,
      reload: jest.fn(),
    } as never);
  });

  it('routes search to Today and bell to Notifications', () => {
    const { getByLabelText } = render(<HomeScreen />);

    fireEvent.press(getByLabelText('Search'));
    fireEvent.press(getByLabelText('Notifications'));

    expect(mockRouterPush).toHaveBeenCalledTimes(2);
    expect(mockRouterPush).toHaveBeenNthCalledWith(1, '/home/today');
    expect(mockRouterPush).toHaveBeenNthCalledWith(2, '/reminders/notifications');
  });
});
