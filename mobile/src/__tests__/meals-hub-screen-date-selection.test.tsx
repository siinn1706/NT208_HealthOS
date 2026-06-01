/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MealsHubScreen } from '../components/meals/meals-hub-screen';
import { mealService, nutritionService } from '../api/services';
import { invalidateApiQuery } from '../api/query';
import { toLocalDateInput } from '../components/meals/meal-date';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../api/services', () => ({
  mealService: {
    list: jest.fn(),
    caloriesSummary: jest.fn(),
  },
  nutritionService: {
    suggestions: jest.fn(),
  },
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/charts/sparkline', () => ({
  Sparkline: () => null,
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, number>) => params?.count !== undefined ? `${key}:${params.count}` : key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockMealList = mealService.list as jest.MockedFunction<typeof mealService.list>;
const mockCaloriesSummary = mealService.caloriesSummary as jest.MockedFunction<typeof mealService.caloriesSummary>;
const mockSuggestions = nutritionService.suggestions as jest.MockedFunction<typeof nutritionService.suggestions>;

function isoDate(date: Date) {
  return toLocalDateInput(date);
}

beforeEach(() => {
  invalidateApiQuery();
  jest.clearAllMocks();
  jest.useRealTimers();
  mockMealList.mockResolvedValue([]);
  mockCaloriesSummary.mockResolvedValue([]);
  mockSuggestions.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MealsHubScreen date selection', () => {
  it('loads Core meals for the selected week-strip date instead of showing the guarded calendar message', async () => {
    const todayIso = isoDate(new Date());
    const target = new Date();
    target.setDate(target.getDate() - 2);
    const targetIso = isoDate(target);

    const { getByLabelText, queryByText } = render(<MealsHubScreen />);

    await waitFor(() => expect(mockMealList).toHaveBeenCalledWith({
      page: 1,
      per_page: 100,
      date_from: todayIso,
      date_to: todayIso,
    }));

    fireEvent.press(getByLabelText(`Select meal date ${targetIso}`));

    await waitFor(() => expect(mockMealList).toHaveBeenCalledWith({
      page: 1,
      per_page: 100,
      date_from: targetIso,
      date_to: targetIso,
    }));
    expect(queryByText('Date picker is guarded until native date selection is wired. Current data uses today from Core /v1/meals.')).toBeNull();
    expect(queryByText('Action unavailable')).toBeNull();
  });

  it('resets the selected date to today from the calendar action', async () => {
    const todayIso = isoDate(new Date());
    const target = new Date();
    target.setDate(target.getDate() - 3);
    const targetIso = isoDate(target);

    const { getByLabelText } = render(<MealsHubScreen />);
    await waitFor(() => expect(mockMealList).toHaveBeenCalledWith(expect.objectContaining({ date_from: todayIso })));

    fireEvent.press(getByLabelText(`Select meal date ${targetIso}`));
    await waitFor(() => expect(mockMealList).toHaveBeenCalledWith(expect.objectContaining({ date_from: targetIso })));

    fireEvent.press(getByLabelText('common.calendar'));
    await waitFor(() => expect(mockMealList).toHaveBeenLastCalledWith(expect.objectContaining({
      date_from: todayIso,
      date_to: todayIso,
    })));
  });

  it('formats date inputs in the device timezone instead of UTC', () => {
    const earlyMorningInVietnam = new Date('2026-06-01T01:30:00+07:00');

    expect(toLocalDateInput(earlyMorningInVietnam, 'Asia/Bangkok')).toBe('2026-06-01');
    expect(toLocalDateInput(earlyMorningInVietnam, 'UTC')).toBe('2026-05-31');
  });
});
