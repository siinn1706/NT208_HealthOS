/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { MealScanResultsScreen } from '../components/meals/meal-scan-results-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ mealId: 'meal-1' }),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
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
  ProgressRing: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

const meal = {
  id: 'meal-1',
  name: 'Chicken rice',
  image_url: null,
  job_id: 'job-1',
  status: 'analyzed',
  nutrition_result: {
    dish_name: 'Chicken rice',
    serving_type: 'lunch',
    meal_type: 'lunch',
    calories: 520,
    protein_g: 32,
    carbs_g: 58,
    fat_g: 14,
    saturates_g: 1,
    sugar_g: 3,
    salt_g: 0.6,
    confidence: 0.82,
    source: 'ai',
  },
  logged_at: '2099-06-02T12:00:00.000Z',
  created_at: '2099-06-02T12:01:00.000Z',
};

const ingredients = [
  {
    name: 'Rice',
    grams: 150,
    kcal: 220,
    carbs_g: 45,
    protein_g: 4,
    fat_g: 1,
  },
];

describe('MealScanResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.meal('meal-1')) {
        return { ...baseQueryState, data: meal } as never;
      }
      if (key === queryKeys.mealIngredients('meal-1')) {
        return { ...baseQueryState, data: ingredients } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
  });

  it('keeps scan results on implemented actions only', () => {
    const { getByText, queryByText } = render(<MealScanResultsScreen />);

    expect(getByText('Confirm meal')).toBeTruthy();
    expect(getByText('Chicken rice')).toBeTruthy();
    expect(getByText('Rice')).toBeTruthy();
    expect(getByText('meals.retake')).toBeTruthy();
    expect(getByText('meals.addToLog')).toBeTruthy();
    expect(queryByText('Change')).toBeNull();
    expect(queryByText('Scan edit unavailable')).toBeNull();
  });
});
