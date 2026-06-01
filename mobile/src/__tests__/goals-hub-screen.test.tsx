/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GoalsHubScreen } from '../components/insights/goals/goals-hub-screen';
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
  profileService: {
    me: jest.fn(),
  },
  reminderService: {
    list: jest.fn(),
  },
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: mockPush,
  },
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

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({ name: 'calm' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, number>) => {
      if (key === 'insights.checkInsDone') return `${params?.done ?? 0}/${params?.total ?? 0} check-ins`;
      return ({
        'insights.title': 'Insights',
        'insights.subtitle': 'Health trends',
        'insights.alerts': 'Alerts',
        'insights.newGoal': 'New goal',
        'insights.loadingGoals': 'Loading goals',
        'insights.goalsUnavailable': 'Goals unavailable',
        'insights.basedOnReminders': 'Based on reminders',
        'insights.activeGoals': 'Active goals',
        'insights.noGoalConfigured': 'No goal configured',
        'insights.noGoalMessage': 'Create a health goal.',
        'insights.targetWeight': 'Target weight',
        'insights.dayStreak': `${params?.count ?? 0} day streak`,
        'insights.keepTracking': 'Keep tracking',
        'insights.viewMilestones': 'View milestones',
        'common.retry': 'Retry',
        'common.new': 'New',
        'common.manage': 'Manage',
      }[key] ?? key);
    },
  }),
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

type ProgressStateOverride = {
  error?: Error | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  isEmpty?: boolean;
  reload?: () => Promise<void>;
};

function mockGoalsHubQueries({
  goalData = {
    id: 'goal-1',
    user_id: 'user-1',
    target_weight_kg: 70,
    deadline: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-31T00:00:00.000Z',
  },
  progressData,
  progressState = {},
}: {
  goalData?: {
    id: string;
    user_id: string;
    target_weight_kg: number | null;
    deadline: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  progressData: { date: string; value: number; target: number; progress_percent: number | null }[] | null;
  progressState?: ProgressStateOverride;
}) {
  mockUseApiQuery.mockImplementation((key) => {
    if (key === queryKeys.healthGoal) {
      return {
        ...baseQueryState,
        data: goalData,
      } as never;
    }
    if (key === queryKeys.profile) {
      return {
        ...baseQueryState,
        data: { weight_kg: 80 },
      } as never;
    }
    if (key === queryKeys.remindersAll) {
      return {
        ...baseQueryState,
        data: [
          { id: 'reminder-1', done: true },
          { id: 'reminder-2', done: false },
        ],
      } as never;
    }
    if (key === queryKeys.healthGoalProgress('weight_kg', '7d')) {
      return {
        ...baseQueryState,
        ...progressState,
        data: progressData,
      } as never;
    }
    return { ...baseQueryState, data: null } as never;
  });
}

describe('GoalsHubScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses latest Core weight progress before profile fallback', () => {
    mockGoalsHubQueries({
      progressData: [
        { date: '2026-05-30', value: 75, target: 70, progress_percent: 107.1 },
        { date: '2026-05-31', value: 74, target: 70, progress_percent: 105.7 },
      ],
    });

    const { getByText, queryByText } = render(<GoalsHubScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.healthGoalProgress('weight_kg', '7d'),
      expect.any(Function),
      { enabled: true },
    );
    expect(getByText('74 kg → 70 kg · No deadline')).toBeTruthy();
    expect(queryByText('80 kg → 70 kg · No deadline')).toBeNull();
  });

  it('falls back to profile weight when progress has no records', () => {
    mockGoalsHubQueries({ progressData: [] });

    const { getByText } = render(<GoalsHubScreen />);

    expect(getByText('80 kg → 70 kg · No deadline')).toBeTruthy();
  });

  it('ignores stale disabled progress state when goal has no target', () => {
    mockGoalsHubQueries({
      goalData: {
        id: 'goal-1',
        user_id: 'user-1',
        target_weight_kg: null,
        deadline: null,
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-31T00:00:00.000Z',
      },
      progressData: [
        { date: '2026-05-31', value: 74, target: 70, progress_percent: 105.7 },
      ],
      progressState: {
        error: new Error('Stale progress error'),
        isLoading: true,
      },
    });

    const { getByText, queryByText } = render(<GoalsHubScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.healthGoalProgress('weight_kg', '7d'),
      expect.any(Function),
      { enabled: false },
    );
    expect(getByText('80 kg → 0 kg · No deadline')).toBeTruthy();
    expect(queryByText('Goals unavailable')).toBeNull();
    expect(queryByText('Stale progress error')).toBeNull();
  });
});
