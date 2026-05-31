/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GoalDetailScreen } from '../components/insights/goals/goal-detail-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  healthGoalService: {
    current: jest.fn(),
    progress: jest.fn(),
  },
  profileService: {
    me: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'goal-1' }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

jest.mock('../components/charts/vitals-line-chart', () => ({
  VitalsLineChart: () => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.Text, null, 'weight trend chart');
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

const reload = jest.fn();

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload,
};

describe('GoalDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.healthGoal) {
        return {
          ...baseQueryState,
          data: {
            id: 'goal-1',
            user_id: 'user-1',
            target_weight_kg: 70,
            deadline: null,
            created_at: '2026-05-01T00:00:00.000Z',
            updated_at: '2026-05-31T00:00:00.000Z',
          },
        } as never;
      }
      if (key === queryKeys.profile) {
        return {
          ...baseQueryState,
          data: { weight_kg: 75 },
        } as never;
      }
      if (key === queryKeys.healthGoalProgress('weight_kg', '7d')) {
        return {
          ...baseQueryState,
          data: [
            { date: '2026-05-25', value: 75, target: 70, progress_percent: 107.1 },
            { date: '2026-05-31', value: 74, target: 70, progress_percent: 105.7 },
          ],
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
  });

  it('renders Core-backed weekly weight progress instead of a missing API guard', () => {
    const { getAllByText, getByText, queryByText } = render(<GoalDetailScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.healthGoalProgress('weight_kg', '7d'),
      expect.any(Function),
      { enabled: true },
    );
    expect(queryByText('Weekly progress chart unavailable')).toBeNull();
    expect(queryByText('Check-in history unavailable')).toBeNull();
    expect(getByText('weight trend chart')).toBeTruthy();
    expect(getAllByText('74.0 kg').length).toBeGreaterThan(0);
    expect(getByText('Save weight')).toBeTruthy();
    expect(getByText('Recorded days')).toBeTruthy();
    expect(getAllByText('Target 70.0 kg').length).toBeGreaterThan(0);
  });
});
