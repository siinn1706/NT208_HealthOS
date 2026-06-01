/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MealDetailScreen } from '../components/meals/meal-detail-screen';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { mealService } from '../api/services';

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'meal-1' }),
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
  }),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  mealService: {
    detail: jest.fn(),
    ingredients: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockDeleteMeal = mealService.delete as jest.MockedFunction<typeof mealService.delete>;

const mealQuery = {
  data: {
    id: 'meal-1',
    name: 'Chicken rice',
    image_url: null,
    job_id: null,
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
      confidence: null,
      source: 'manual',
    },
    logged_at: '2026-05-30T12:00:00.000Z',
    created_at: '2026-05-30T12:01:00.000Z',
  },
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

const ingredientsQuery = {
  data: [
    {
      name: 'Chicken rice',
      grams: 100,
      kcal: 520,
      carbs_g: 58,
      protein_g: 32,
      fat_g: 14,
    },
  ],
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

function mockQueries() {
  mockUseApiQuery.mockImplementation((key) => {
    const text = String(key);
    if (text.startsWith('meals.ingredients')) return ingredientsQuery as never;
    return mealQuery as never;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
  mockDeleteMeal.mockResolvedValue(undefined);
});

describe('MealDetailScreen delete', () => {
  it('deletes the meal, invalidates meal caches, and returns to the meals hub', async () => {
    const { getByText } = render(<MealDetailScreen />);

    fireEvent.press(getByText('Delete meal'));

    await waitFor(() => expect(mockDeleteMeal).toHaveBeenCalledWith('meal-1'));
    expect(mockDeleteMeal).toHaveBeenCalledTimes(1);
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.detail.meal-1');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.ingredients.meal-1');
    expect(mockReplace).toHaveBeenCalledWith('/meals');
  });

  it('keeps the user on detail and shows the API error when delete fails', async () => {
    mockDeleteMeal.mockRejectedValueOnce(new Error('Delete failed'));
    const { getByText } = render(<MealDetailScreen />);

    fireEvent.press(getByText('Delete meal'));

    await waitFor(() => expect(getByText('Delete failed')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('prevents duplicate delete requests while one is pending', () => {
    mockDeleteMeal.mockReturnValueOnce(new Promise<void>(() => undefined));
    const { getByText } = render(<MealDetailScreen />);
    const deleteAction = getByText('Delete meal');

    fireEvent.press(deleteAction);
    fireEvent.press(deleteAction);

    expect(mockDeleteMeal).toHaveBeenCalledTimes(1);
  });
});
