/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MealScanResultsScreen } from '../components/meals/meal-scan-results-screen';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { mealService } from '../api/services';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: { mealId?: string; imageUri?: string } = { mealId: 'meal-1' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
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

jest.mock('../api/services', () => ({
  mealService: {
    update: jest.fn(),
  },
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockUpdateMeal = mealService.update as jest.MockedFunction<typeof mealService.update>;

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
    calorie_min: 470,
    calorie_max: 610,
    saturates_g: 1,
    sugar_g: 3,
    salt_g: 0.6,
    confidence: 0.82,
    portion_options: [
      { value: 'small', label: 'Ít', scale: 0.75 },
      { value: 'medium', label: 'Vừa', scale: 1 },
      {
        value: 'large',
        label: 'Nhiều',
        scale: 1.25,
        calories: 702,
        calorie_min: 636,
        calorie_max: 814,
        carbs_g: 74,
        protein_g: 41,
        fat_g: 18,
      },
    ],
    warnings: ['Confirm portion'],
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
    mockParams = { mealId: 'meal-1' };
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.meal('meal-1')) {
        return { ...baseQueryState, data: meal } as never;
      }
      if (key === queryKeys.mealIngredients('meal-1')) {
        return { ...baseQueryState, data: ingredients } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
    mockUpdateMeal.mockResolvedValue(meal as never);
  });

  it('keeps scan results on implemented actions only', () => {
    const { getAllByText, getByText, queryByText } = render(<MealScanResultsScreen />);

    expect(getAllByText('meals.confirmMeal')).toHaveLength(2);
    expect(getByText('Chicken rice')).toBeTruthy();
    expect(getByText('Rice')).toBeTruthy();
    expect(getByText('Ít')).toBeTruthy();
    expect(getByText('Vừa')).toBeTruthy();
    expect(getByText('Nhiều')).toBeTruthy();
    expect(getByText('Confirm portion')).toBeTruthy();
    expect(getByText('meals.retake')).toBeTruthy();
    expect(queryByText('Change')).toBeNull();
    expect(queryByText('Scan edit unavailable')).toBeNull();
  });

  it('shows the captured photo from the scan route before backend image fallback', () => {
    mockParams = { mealId: 'meal-1', imageUri: 'file:///captured-meal.jpg' };

    const { getByTestId } = render(<MealScanResultsScreen />);

    expect(getByTestId('meal-scan-results-photo').props.source).toEqual({ uri: 'file:///captured-meal.jpg' });
  });

  it('keeps the captured image when opening the logged meal detail view', () => {
    mockParams = { mealId: 'meal-1', imageUri: 'file:///captured-meal.jpg' };

    const { getAllByText } = render(<MealScanResultsScreen />);

    fireEvent.press(getAllByText('meals.confirmMeal')[1]);

    return waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/meals/meal-1?imageUri=file%3A%2F%2F%2Fcaptured-meal.jpg');
    });
  });

  it('persists selected scaled nutrition before navigating to meal detail', async () => {
    const { getByText, getAllByText } = render(<MealScanResultsScreen />);

    fireEvent.press(getByText('Nhiều'));
    fireEvent.press(getAllByText('meals.confirmMeal')[1]);

    await waitFor(() => expect(mockUpdateMeal).toHaveBeenCalledTimes(1));
    expect(mockUpdateMeal).toHaveBeenCalledWith(
      'meal-1',
      expect.objectContaining({
        nutrition_result: expect.objectContaining({
          calories: 702,
          calorie_min: 636,
          calorie_max: 814,
          carbs_g: 74,
          protein_g: 41,
          fat_g: 18,
          portion_estimate: 'large',
        }),
      }),
    );
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.detail.meal-1');
  });

  it('falls back to localized default portions when backend portion options are missing', () => {
    const mealWithDefaultPortions = {
      ...meal,
      nutrition_result: {
        ...meal.nutrition_result,
        portion_options: undefined,
      },
    };

    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.meal('meal-1')) {
        return { ...baseQueryState, data: mealWithDefaultPortions } as never;
      }
      if (key === queryKeys.mealIngredients('meal-1')) {
        return { ...baseQueryState, data: ingredients } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });

    const { getByText } = render(<MealScanResultsScreen />);

    expect(getByText('meals.portionSmall')).toBeTruthy();
    expect(getByText('meals.portionMedium')).toBeTruthy();
    expect(getByText('meals.portionLarge')).toBeTruthy();
  });
});
