/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import HomeScreen from '../../app/(tabs)/home';
import { useApiQuery } from '../api/query';
import type { DashboardAiAdvice, DashboardSummary } from '../../../shared/api-contracts';

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
      'home.aiInsightCard': 'AI Insight',
      'home.aiAdviceLoadingTitle': 'AI is analyzing',
      'home.aiAdviceLoadingBody': 'Reading your latest health signals.',
      'home.noAiInsight': 'No AI insight yet',
      'home.noAiInsightMessage': 'AI insight empty',
      'home.quickActions': 'Quick actions',
      'home.quickActionMeal': 'Meal',
      'home.quickActionVitals': 'Vitals',
      'home.quickActionAi': 'AI',
      'home.quickActionInsights': 'Insights',
    }[key] ?? key),
    i18n: { language: 'en' },
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
const queryState = <T,>(overrides: Partial<{
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  reload: jest.Mock;
}> = {}) => ({
  data: null,
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
  ...overrides,
});

const summaryFixture: DashboardSummary = {
  user_name: 'Test User',
  alerts: [],
  goals: [],
  kpis: {
    health_score: {
      current: 82,
      target: 100,
      unit: 'score',
      trend: 'stable',
    },
  },
  ai_insight: {
    text: 'Summary insight fallback',
    category: 'activity',
    insight_code: null,
    insight_params: null,
  },
} as DashboardSummary;

const adviceFixture: DashboardAiAdvice = {
  id: 'advice-1',
  status: 'ready',
  category: 'activity',
  priority: 'medium',
  title: 'Walk after lunch',
  body: 'A short walk helps close today steps gap.',
  source: 'ai',
  actions: [{ id: 'walk-1', type: 'walk', label: 'Walk now' }],
  evidence: [{ metric: 'Steps', value: 800, unit: 'steps', comparison: 'below target' }],
  rag_sources: [],
  generated_at: '2026-06-30T12:00:00Z',
  expires_at: '2026-06-30T12:15:00Z',
  disclaimer: 'Informational only.',
};

function mockHomeQueries({
  summary,
  advice = null,
  adviceLoading = false,
}: {
  summary: DashboardSummary | null;
  advice?: DashboardAiAdvice | null;
  adviceLoading?: boolean;
}) {
  mockUseApiQuery
    .mockReturnValueOnce(queryState({
      data: { summary, reminders: [], vitalPoints: [] },
    }) as never)
    .mockReturnValueOnce(queryState({
      data: advice,
      isLoading: adviceLoading,
    }) as never);
}

describe('HomeScreen top actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes search to Today and bell to Notifications', () => {
    mockHomeQueries({ summary: null });

    const { getByLabelText } = render(<HomeScreen />);

    fireEvent.press(getByLabelText('Search'));
    fireEvent.press(getByLabelText('Notifications'));

    expect(mockRouterPush).toHaveBeenCalledTimes(2);
    expect(mockRouterPush).toHaveBeenNthCalledWith(1, '/home/today');
    expect(mockRouterPush).toHaveBeenNthCalledWith(2, '/reminders/notifications');
  });

  it('keeps the AI advice slot visible while dashboard summary is empty', () => {
    mockHomeQueries({ summary: null, adviceLoading: true });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('AI Insight')).toBeTruthy();
    expect(getByText('AI is analyzing')).toBeTruthy();
    expect(getByText('Reading your latest health signals.')).toBeTruthy();
  });

  it('renders fulfilled AI advice when dashboard summary is present', () => {
    mockHomeQueries({ summary: summaryFixture, advice: adviceFixture });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('AI Insight')).toBeTruthy();
    expect(getByText('Walk after lunch')).toBeTruthy();
    expect(getByText('A short walk helps close today steps gap.')).toBeTruthy();
  });

  it('opens the current AI insight detail route from the Home AI card', () => {
    mockHomeQueries({ summary: summaryFixture, advice: adviceFixture });

    const { getByText } = render(<HomeScreen />);

    fireEvent.press(getByText('Walk after lunch'));

    expect(mockRouterPush).toHaveBeenCalledWith('/home/insight/current');
  });
});
