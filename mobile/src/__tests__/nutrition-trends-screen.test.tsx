/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { NutritionTrendsScreen } from '../components/meals/nutrition-trends-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('../components/meals/macro-donut', () => ({
  MacroDonut: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('NutritionTrendsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockImplementation((key) => {
      if (String(key).startsWith('meals.calories.')) {
        return {
          ...baseQueryState,
          data: [
            { date: '2026-05-30', total_calories: 700 },
            { date: '2026-05-31', total_calories: 900 },
          ],
        } as never;
      }
      if (String(key).startsWith('meals.list.trends.')) {
        return {
          ...baseQueryState,
          data: [{
            id: 'meal-1',
            name: 'Rice bowl',
            image_url: null,
            job_id: null,
            status: 'ready',
            nutrition_result: {
              dish_name: 'Rice bowl',
              serving_type: null,
              calories: 800,
              protein_g: 25,
              carbs_g: 90,
              fat_g: 18,
              saturates_g: null,
              sugar_g: null,
              salt_g: null,
              confidence: 0.91,
              source: 'ai',
            },
            logged_at: '2026-05-31T12:00:00Z',
            created_at: '2026-05-31T12:00:00Z',
          }],
        } as never;
      }
      if (String(key) === queryKeys.reportTrend('calories', '7d')) {
        return { ...baseQueryState, data: { trend: 'increasing', change_percent: 12 } } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
  });

  it('renders Core calorie summary, meal list, and report trend data', () => {
    const { getByText } = render(<NutritionTrendsScreen />);

    expect(getByText('Core calorie trend: increasing')).toBeTruthy();
    expect(getByText('12% change from Core reports')).toBeTruthy();
    expect(getByText('Rice bowl')).toBeTruthy();

    fireEvent.press(getByText('Rice bowl'));

    expect(mockRouterPush).toHaveBeenCalledWith('/meals/meal-1');
  });

  it('does not expose unsupported custom date range affordances', () => {
    const { queryByLabelText, queryByText } = render(<NutritionTrendsScreen />);

    expect(queryByLabelText('Change range')).toBeNull();
    expect(queryByText('Date range unavailable')).toBeNull();
  });
});
