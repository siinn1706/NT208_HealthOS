/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AiInsightDetailScreen } from '../components/home/ai-insight-detail-screen';
import { useApiQuery } from '../api/query';
import type { DashboardAiAdvice, DashboardSummary } from '../../../shared/api-contracts';

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
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
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
  alerts: [{ id: 'alert-bp', type: 'critical', message: 'BP_SYSTOLIC_HIGH', alert_code: 'BP_SYSTOLIC_HIGH', alert_params: null }],
  kpis: {
    steps: { current: 4200, target: 10000 },
    heartRate: { current: 74, target: 100 },
  },
  goals: [],
  ai_insight: { text: 'CALORIE_LOW', category: 'nutrition', insight_code: 'CALORIE_LOW', insight_params: null },
} as DashboardSummary;

const adviceFixture: DashboardAiAdvice = {
  id: 'advice-1',
  status: 'ready',
  category: 'activity',
  priority: 'medium',
  title: 'Take a short walk',
  body: 'You are under today steps target.',
  source: 'ai',
  actions: [
    { id: 'walk-1', type: 'walk', label: 'Open vitals' },
    { id: 'chat-1', type: 'open_chat', label: 'Ask AI' },
    { id: 'trend-1', type: 'view_trends', label: 'Hidden third action' },
  ],
  evidence: [{ metric: 'Steps', value: 4200, unit: 'steps', comparison: 'below target' }],
  rag_sources: [],
  generated_at: '2026-06-30T12:00:00Z',
  expires_at: '2026-06-30T12:15:00Z',
  disclaimer: 'Not medical advice.',
};

function mockDetailQueries({
  summary = summaryFixture,
  advice = null,
  adviceError = null,
  adviceLoading = false,
  adviceRefreshing = false,
  adviceReload = jest.fn(),
}: {
  summary?: DashboardSummary | null;
  advice?: DashboardAiAdvice | null;
  adviceError?: Error | null;
  adviceLoading?: boolean;
  adviceRefreshing?: boolean;
  adviceReload?: jest.Mock;
}) {
  mockUseApiQuery.mockImplementation((key: string) => {
    if (key.startsWith('dashboard.ai-advice')) {
      return queryState({
        data: advice,
        error: adviceError,
        isLoading: adviceLoading,
        isRefreshing: adviceRefreshing,
        isEmpty: !advice && !adviceLoading && !adviceError,
        reload: adviceReload,
      }) as never;
    }
    return queryState({
      data: summary,
      isEmpty: !summary,
    }) as never;
  });
}

describe('AiInsightDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows AI analysis loading instead of summary fallback while advice is pending', () => {
    mockDetailQueries({ adviceLoading: true });

    const { getByText, queryByText } = render(<AiInsightDetailScreen />);

    expect(getByText('home.aiAdviceLoadingTitle')).toBeTruthy();
    expect(queryByText('home.insightCalorieLowTitle')).toBeNull();
    expect(queryByText('Bp Systolic High')).toBeNull();
    expect(queryByText(/4[,.]200 \/ 10[,.]000/)).toBeNull();
    expect(queryByText('home.currentSignals')).toBeNull();
  });

  it('shows AI analysis loading while cached advice is refreshing', () => {
    mockDetailQueries({ advice: adviceFixture, adviceRefreshing: true });

    const { getByText, queryByText } = render(<AiInsightDetailScreen />);

    expect(getByText('home.aiAdviceLoadingTitle')).toBeTruthy();
    expect(queryByText('Take a short walk')).toBeNull();
    expect(queryByText('home.currentSignals')).toBeNull();
  });

  it('renders dashboard AI advice data and routes advice actions', () => {
    mockDetailQueries({ advice: adviceFixture });

    const { getByText, queryByText } = render(<AiInsightDetailScreen />);

    expect(getByText('home.aiAdviceSourceAi')).toBeTruthy();
    expect(getByText('Take a short walk')).toBeTruthy();
    expect(getByText('You are under today steps target.')).toBeTruthy();
    expect(getByText('home.aiAdviceEvidence')).toBeTruthy();
    expect(getByText('Steps: 4200 steps · below target')).toBeTruthy();
    expect(getByText('Not medical advice.')).toBeTruthy();
    expect(queryByText('Hidden third action')).toBeNull();
    expect(queryByText('home.currentSignals')).toBeNull();

    fireEvent.press(getByText('Open vitals'));
    expect(mockRouterPush).toHaveBeenCalledWith('/home/vitals');

    fireEvent.press(getByText('Ask AI'));
    expect(mockRouterPush).toHaveBeenCalledWith('/chat');
  });

  it('shows unavailable retry state without falling back to summary content', () => {
    const reload = jest.fn();
    mockDetailQueries({ adviceError: new Error('advice failed'), adviceReload: reload });

    const { getByText, queryByText } = render(<AiInsightDetailScreen />);

    expect(getByText('home.aiAdviceUnavailable')).toBeTruthy();
    expect(getByText('home.aiAdviceUnavailableMessage')).toBeTruthy();
    expect(queryByText('home.insightCalorieLowTitle')).toBeNull();
    expect(queryByText('Bp Systolic High')).toBeNull();
    expect(queryByText('home.currentSignals')).toBeNull();

    fireEvent.press(getByText('common.retry'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows unavailable retry state instead of stale cached advice after refresh error', () => {
    const reload = jest.fn();
    mockDetailQueries({ advice: adviceFixture, adviceError: new Error('refresh failed'), adviceReload: reload });

    const { getByText, queryByText } = render(<AiInsightDetailScreen />);

    expect(getByText('home.aiAdviceUnavailable')).toBeTruthy();
    expect(queryByText('Take a short walk')).toBeNull();
    expect(queryByText('home.currentSignals')).toBeNull();

    fireEvent.press(getByText('common.retry'));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
