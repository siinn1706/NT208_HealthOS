/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AddMealScreen } from '../components/meals/add-meal-screen';
import { mealService, nutritionService } from '../api/services';
import { invalidateApiQuery } from '../api/query';
import type { IngredientCatalogItem, Meal } from '../../../shared/api-contracts';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, string>) => params?.slot ? `${key}:${params.slot}` : key }),
}));

jest.mock('../api/services', () => ({
  mealService: {
    create: jest.fn(),
    list: jest.fn(),
  },
  nutritionService: {
    ingredients: jest.fn(),
  },
}));

jest.mock('../api/query', () => {
  const actual = jest.requireActual('../api/query');
  return {
    ...actual,
    invalidateApiQuery: jest.fn(actual.invalidateApiQuery),
  };
});

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockMealCreate = mealService.create as jest.MockedFunction<typeof mealService.create>;
const mockMealList = mealService.list as jest.MockedFunction<typeof mealService.list>;
const mockNutritionIngredients = nutritionService.ingredients as jest.MockedFunction<typeof nutritionService.ingredients>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

const ingredient: IngredientCatalogItem = {
  id: '6e7b777a-2364-4f33-84aa-25d6a3993f21',
  slug: 'uc-ga',
  name_vi: 'Ức gà',
  name_en: 'Chicken breast',
  category: 'protein',
  calories_per_100g: 165,
  protein_per_100g: 31,
  carbs_per_100g: 0,
  fat_per_100g: 3.6,
  unit_hint: 'raw',
  name_en_verified: true,
};

const historyMeal: Meal = {
  id: 'meal-history-1',
  name: 'Chicken rice',
  image_url: null,
  job_id: null,
  status: 'ready',
  nutrition_result: {
    dish_name: 'Chicken rice',
    serving_type: 'lunch',
    meal_type: 'lunch',
    calories: 520,
    protein_g: 32,
    carbs_g: 58,
    fat_g: 14,
    saturates_g: null,
    sugar_g: null,
    salt_g: null,
    confidence: null,
    source: 'manual',
  },
  logged_at: '2026-05-30T12:00:00.000Z',
  created_at: '2026-05-30T12:01:00.000Z',
};

beforeEach(() => {
  mockInvalidateApiQuery();
  jest.clearAllMocks();
  mockMealCreate.mockResolvedValue({
    id: 'meal-1',
    name: 'Lunch',
    image_url: null,
    job_id: null,
    status: 'pending',
    nutrition_result: null,
    logged_at: '2026-05-30T12:00:00.000Z',
    created_at: '2026-05-30T12:00:00.000Z',
  });
  mockMealList.mockResolvedValue([historyMeal]);
  mockNutritionIngredients.mockResolvedValue([ingredient]);
});

describe('AddMealScreen', () => {
  it('only exposes supported meal entry actions on Android mobile', async () => {
    const { getAllByText, getByText, queryByText } = render(<AddMealScreen />);

    await waitFor(() => expect(mockMealList).toHaveBeenCalledWith({ page: 1, per_page: 20 }));
    expect(getByText('meals.scanWithAi')).toBeTruthy();
    expect(getAllByText('meals.manualEntry').length).toBeGreaterThan(0);
    expect(getByText('meals.fromHistory')).toBeTruthy();
    expect(queryByText('meals.barcode')).toBeNull();
    expect(queryByText('meals.packagedFoods')).toBeNull();
    expect(queryByText('Barcode lookup unavailable')).toBeNull();
  });

  it('persists manual meal entry through mealService.create', async () => {
    const { getByPlaceholderText, getByText } = render(<AddMealScreen />);

    fireEvent.changeText(getByPlaceholderText('e.g. Grilled chicken rice'), 'Bun bo');
    fireEvent.changeText(getByPlaceholderText('Notes, portion, ingredients'), 'Less oil');
    fireEvent.press(getByText('Save meal'));

    await waitFor(() => {
      expect(mockMealCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Bun bo',
        notes: 'Less oil',
        meal_type: 'lunch',
      }));
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('meals.');
    expect(mockReplace).toHaveBeenCalledWith('/meals');
  });

  it('shows API errors without navigating or invalidating cached meals', async () => {
    mockMealCreate.mockRejectedValueOnce(new Error('API down'));
    const { getByPlaceholderText, getByText } = render(<AddMealScreen />);

    fireEvent.changeText(getByPlaceholderText('e.g. Grilled chicken rice'), 'Bun bo');
    fireEvent.press(getByText('Save meal'));

    await waitFor(() => expect(getByText('API down')).toBeTruthy());
    expect(mockInvalidateApiQuery).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('prevents duplicate manual saves while the create request is pending', async () => {
    let resolveCreate: (value: Awaited<ReturnType<typeof mealService.create>>) => void = () => {};
    mockMealCreate.mockReturnValueOnce(new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    const { getAllByRole, getByPlaceholderText, getByText } = render(<AddMealScreen />);

    fireEvent.changeText(getByPlaceholderText('e.g. Grilled chicken rice'), 'Bun bo');
    fireEvent.press(getByText('Save meal'));
    const disabledSave = getAllByRole('button').find((item) => item.props.accessibilityState?.disabled === true);
    expect(disabledSave).toBeTruthy();
    fireEvent.press(disabledSave!);

    expect(mockMealCreate).toHaveBeenCalledTimes(1);

    resolveCreate({
      id: 'meal-1',
      name: 'Lunch',
      image_url: null,
      job_id: null,
      status: 'pending',
      nutrition_result: null,
      logged_at: '2026-05-30T12:00:00.000Z',
      created_at: '2026-05-30T12:00:00.000Z',
    });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/meals'));
  });

  it('searches the ingredient catalog and saves the selected ingredient', async () => {
    const { getByPlaceholderText, getByText } = render(<AddMealScreen />);

    const search = getByPlaceholderText('meals.searchFoods');
    fireEvent.changeText(search, 'chicken');
    fireEvent(search, 'submitEditing');

    await waitFor(() => expect(mockNutritionIngredients).toHaveBeenCalledWith({ q: 'chicken', per_page: 8 }));
    fireEvent.press(getByText('Ức gà'));
    expect(getByText('Ingredient selected')).toBeTruthy();

    fireEvent.press(getByText('Save meal'));

    await waitFor(() => {
      expect(mockMealCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Ức gà',
        ingredients: [expect.objectContaining({
          ingredient_id: ingredient.id,
          ingredient_name: 'Ức gà',
          ingredient_name_en: 'Chicken breast',
          grams: 100,
          kcal: 165,
          is_matched: true,
        })],
      }));
    });
  });

  it('loads meal history and reuses a selected history meal without fake static rows', async () => {
    const { getByText, queryByText } = render(<AddMealScreen />);

    await waitFor(() => expect(mockMealList).toHaveBeenCalledWith({ page: 1, per_page: 20 }));
    expect(queryByText('Bún chả')).toBeNull();
    expect(queryByText('Meal history reuse unavailable')).toBeNull();

    fireEvent.press(getByText('Chicken rice'));
    expect(getByText('History meal selected')).toBeTruthy();
    fireEvent.press(getByText('Save meal'));

    await waitFor(() => {
      expect(mockMealCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Chicken rice',
        notes: expect.stringContaining('Copied from meal history'),
        meal_type: 'lunch',
        ingredients: [expect.objectContaining({
          ingredient_name: 'Chicken rice',
          kcal: 520,
          protein_g: 32,
          carbs_g: 58,
          fat_g: 14,
          is_matched: false,
        })],
      }));
    });
  });

  it('shows retryable feedback when meal history fails', async () => {
    mockMealList.mockRejectedValueOnce(new Error('History down'));
    const { getAllByText, getByText } = render(<AddMealScreen />);

    await waitFor(() => expect(getAllByText('History down')).toHaveLength(2));
    expect(getByText('Meal history unavailable')).toBeTruthy();
    expect(getByText('Recent meals unavailable')).toBeTruthy();
  });

  it('shows API feedback when ingredient search fails', async () => {
    mockNutritionIngredients.mockRejectedValueOnce(new Error('Catalog down'));
    const { getByPlaceholderText, getByText } = render(<AddMealScreen />);

    const search = getByPlaceholderText('meals.searchFoods');
    fireEvent.changeText(search, 'pho');
    fireEvent(search, 'submitEditing');

    await waitFor(() => expect(getByText('Catalog down')).toBeTruthy());
    expect(mockMealCreate).not.toHaveBeenCalled();
  });
});
