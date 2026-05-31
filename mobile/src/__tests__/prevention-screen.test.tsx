/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PreventionScreen } from '../components/insights/risk/prevention-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
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

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('PreventionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.riskSummary) {
        return {
          ...baseQueryState,
          data: {
            risks: [{
              id: 'risk-hypertension',
              condition: 'hypertension',
              level: 'high',
              probability: 0.62,
              tips: [{ priority: 'high', title: 'reduce sodium', description: 'choose low salt meals' }],
            }],
          },
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
  });

  it('derives prevention cards from Core risk tips and guards tracking', () => {
    const { getByText } = render(<PreventionScreen />);

    expect(getByText('Reduce Sodium')).toBeTruthy();
    expect(getByText('Choose Low Salt Meals')).toBeTruthy();

    fireEvent.press(getByText('Track unavailable'));

    expect(getByText('Prevention tracking unavailable')).toBeTruthy();
    expect(getByText('This recommendation is from Core risk predictions. It is not marked started because no saved prevention-action contract exists yet.')).toBeTruthy();
  });
});
