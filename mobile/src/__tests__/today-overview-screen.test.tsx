/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TodayOverviewScreen } from '../components/home/today-overview-screen';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, string>) => (params?.date ? `${key} ${params.date}` : key) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;

describe('TodayOverviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes score explanation to the Health Score detail screen', () => {
    mockUseApiQuery.mockReturnValue({
      data: {
        score: { value: 72, target: 100, copy: 'Based on real inputs.' },
        kpis: [],
        nextUp: [],
        aiInsight: null,
        vitals: { avg: 74, trend: [72, 74], deltaBpm: 2 },
      },
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: false,
      reload: jest.fn(),
    } as never);

    const { getByText } = render(<TodayOverviewScreen />);

    fireEvent.press(getByText('home.howCalculated'));

    expect(mockRouterPush).toHaveBeenCalledWith('/home/score');
  });
});
