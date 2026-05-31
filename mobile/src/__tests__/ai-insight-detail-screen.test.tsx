/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AiInsightDetailScreen } from '../components/home/ai-insight-detail-screen';
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
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;

describe('AiInsightDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Core insight data and removes the static recovery-score copy', () => {
    mockUseApiQuery.mockReturnValue({
      data: {
        user_name: 'Test User',
        alerts: [{ id: 'alert-bp', type: 'critical', message: 'BP_SYSTOLIC_HIGH', alert_code: 'BP_SYSTOLIC_HIGH', alert_params: null }],
        kpis: {
          steps: { current: 4200, target: 10000 },
          heartRate: { current: 74, target: 100 },
        },
        goals: [],
        ai_insight: { text: 'CALORIE_LOW', category: 'nutrition', insight_code: 'CALORIE_LOW', insight_params: null },
      },
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: false,
      reload: jest.fn(),
    } as never);

    const { getByText, queryByText } = render(<AiInsightDetailScreen />);

    expect(getByText('home.insightCalorieLowTitle')).toBeTruthy();
    expect(getByText('Bp Systolic High')).toBeTruthy();
    expect(getByText(/4[,.]200 \/ 10[,.]000/)).toBeTruthy();
    expect(queryByText('Your recovery score dropped 12% this week')).toBeNull();

    fireEvent.press(getByText('home.viewRelatedMetrics'));

    expect(mockRouterPush).toHaveBeenCalledWith('/meals');
  });
});
