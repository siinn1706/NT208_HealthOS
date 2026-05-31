/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GoalStreaksScreen } from '../components/insights/goals/goal-streaks-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  healthGoalService: {
    current: jest.fn(),
    progress: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
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

describe('GoalStreaksScreen', () => {
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
      if (key === queryKeys.healthGoalProgress('weight_kg', '30d')) {
        return {
          ...baseQueryState,
          data: [
            { date: '2026-05-27', value: 72, target: 70, progress_percent: 102.8 },
            { date: '2026-05-29', value: 71, target: 70, progress_percent: 101.4 },
            { date: '2026-05-30', value: 70.5, target: 70, progress_percent: 100.7 },
            { date: '2026-05-31', value: 69.8, target: 70, progress_percent: 99.7 },
          ],
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
  });

  it('renders Core-backed streaks instead of missing API guards', () => {
    const { getByText, queryByText } = render(<GoalStreaksScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.healthGoalProgress('weight_kg', '30d'),
      expect.any(Function),
      { enabled: true },
    );
    expect(queryByText('Streak calendar data unavailable')).toBeNull();
    expect(queryByText('Per-goal streak summary unavailable')).toBeNull();
    expect(getByText('RECORDED DAY STREAK')).toBeTruthy();
    expect(getByText('Best ever 3 d · 4 recorded days')).toBeTruthy();
    expect(getByText('1 at-target days · latest 69.8 kg')).toBeTruthy();
  });
});
