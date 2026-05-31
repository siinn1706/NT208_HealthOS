/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GoalMilestonesScreen } from '../components/insights/goals/goal-milestones-screen';
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

describe('GoalMilestonesScreen', () => {
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

  it('renders derived milestone status from Core progress points', () => {
    const { getAllByText, getByText, queryByText } = render(<GoalMilestonesScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.healthGoalProgress('weight_kg', '30d'),
      expect.any(Function),
      { enabled: true },
    );
    expect(queryByText('Earned milestones unavailable')).toBeNull();
    expect(queryByText('Milestone progress unavailable')).toBeNull();
    expect(queryByText('All milestones unavailable')).toBeNull();
    expect(getAllByText('Target created').length).toBeGreaterThan(0);
    expect(getAllByText('First weight check-in').length).toBeGreaterThan(0);
    expect(getAllByText('Seven-day tracking streak').length).toBeGreaterThan(0);
    expect(getByText('4')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });
});
