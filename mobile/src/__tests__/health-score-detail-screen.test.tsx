/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { HealthScoreDetailScreen } from '../components/home/health-score-detail-screen';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
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

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;

describe('HealthScoreDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the real score formula panel instead of a missing API state', () => {
    mockUseApiQuery.mockReturnValue({
      data: {
        score: { value: 72, target: 100, copy: 'Based on real inputs.' },
        kpis: [
          { id: 'steps', label: 'Steps', val: '5,000', tgt: '10,000', v: 0.5, color: '#1965B3', icon: 'IconFootprints' },
        ],
        nextUp: [],
        aiInsight: null,
        vitals: { avg: 0, trend: [0], deltaBpm: 0 },
        scoreFormula: {
          sourceKey: 'home.scoreFormulaGoals',
          detailKey: 'home.scoreFormulaGoalsDetail',
          rows: [{ id: 'goal-steps', label: 'Steps', value: '5,000 / 10,000 steps', progress: 0.5 }],
        },
      },
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: false,
      reload: jest.fn(),
    } as never);

    const { getByText, queryByText } = render(<HealthScoreDetailScreen />);

    expect(getByText('home.currentFormula')).toBeTruthy();
    expect(getByText('home.scoreFormulaGoals')).toBeTruthy();
    expect(getByText('5,000 / 10,000 steps')).toBeTruthy();
    expect(queryByText('Detailed score formula unavailable')).toBeNull();
  });
});
