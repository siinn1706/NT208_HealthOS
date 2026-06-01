/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RiskOverviewScreen } from '../components/insights/risk/risk-overview-screen';
import { useApiQuery } from '../api/query';
import { riskService } from '../api/services';
import { router } from 'expo-router';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  riskService: {
    refresh: jest.fn(),
    summary: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../components/insights/risk/risk-gauge', () => ({
  RiskGauge: () => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, { testID: 'risk-gauge' });
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
const mockRouter = router as jest.Mocked<typeof router>;
const mockRiskService = riskService as jest.Mocked<typeof riskService>;

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('RiskOverviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: {
        generatedAt: '2099-06-01T08:00:00.000Z',
        overallScore: 72,
        risks: [{
          id: 'risk-hypertension',
          condition: 'Hypertension',
          level: 'high',
          probability: 0.62,
        }],
      },
    } as never);
  });

  it('routes the more action to the Core-backed prevention screen', () => {
    const { getByLabelText, queryByText } = render(<RiskOverviewScreen />);

    fireEvent.press(getByLabelText('common.more'));

    expect(mockRouter.push).toHaveBeenCalledWith('/insights/risk/prevention');
    expect(queryByText('Risk action unavailable')).toBeNull();
  });

  it('shows refresh failure copy instead of stale dead-action wording', async () => {
    mockRiskService.refresh.mockRejectedValueOnce(new Error('Core refresh failed'));
    const { getByLabelText, getByText, queryByText } = render(<RiskOverviewScreen />);

    fireEvent.press(getByLabelText('common.retry'));

    await waitFor(() => expect(getByText('insights.riskRefreshFailed')).toBeTruthy());
    expect(getByText('Core refresh failed')).toBeTruthy();
    expect(queryByText('Risk action unavailable')).toBeNull();
  });
});
