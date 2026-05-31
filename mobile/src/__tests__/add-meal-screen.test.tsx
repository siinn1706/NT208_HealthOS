/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AddMealScreen } from '../components/meals/add-meal-screen';
import { mealService } from '../api/services';
import { invalidateApiQuery } from '../api/query';

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
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockMealCreate = mealService.create as jest.MockedFunction<typeof mealService.create>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

beforeEach(() => {
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
});

describe('AddMealScreen', () => {
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

  it('shows unavailable feedback for food search instead of silently doing nothing', () => {
    const { getByPlaceholderText, getByText } = render(<AddMealScreen />);

    const search = getByPlaceholderText('meals.searchFoods');
    fireEvent.changeText(search, 'pho');
    fireEvent(search, 'submitEditing');

    expect(getByText('Food search unavailable')).toBeTruthy();
  });
});
