/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { MedicationHistoryScreen } from '../components/meds/medication-history-screen';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
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

describe('MedicationHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: true,
      reload: jest.fn(),
    } as never);
  });

  it('does not render a filter button without a supported filter action', () => {
    const { getByLabelText, queryByLabelText } = render(<MedicationHistoryScreen />);

    expect(getByLabelText('common.back')).toBeTruthy();
    expect(queryByLabelText('common.filter')).toBeNull();
  });
});
