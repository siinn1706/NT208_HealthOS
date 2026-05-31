/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { RiskDetailScreen } from '../components/insights/risk/risk-detail-screen';
import { riskFactorsToTrendMetrics } from '../components/insights/risk/risk-driver-trends-card';
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
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/charts/sparkline', () => ({
  Sparkline: () => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.Text, null, 'driver sparkline');
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
const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('RiskDetailScreen driver trends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'risk-hypertension' });
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.riskSummary) {
        return {
          ...baseQueryState,
          data: {
            generatedAt: '2099-06-01T00:00:00.000Z',
            risks: [{
              id: 'risk-hypertension',
              condition: 'Hypertension',
              level: 'high',
              probability: 0.58,
              factors: [
                { label: 'SYSTOLIC_BP', impact: 'negative', detail: '142' },
                { label: 'DIASTOLIC_BP', impact: 'negative', detail: '92' },
              ],
              tips: [{ priority: 'high', title: 'tip-hypertension-diet', description: 'Reduce sodium' }],
            }],
          },
        } as never;
      }
      if (key === queryKeys.reportTrendBatch('risk-hypertension.blood_pressure', '30d')) {
        return {
          ...baseQueryState,
          data: {
            blood_pressure: {
              metric: 'blood_pressure',
              metric_label: 'SYSTOLIC_BP',
              unit: 'mmHg',
              period: '30d',
              data_points: [
                { date: '2099-05-31', value: 138 },
                { date: '2099-06-01', value: 142 },
              ],
              trend: 'declining',
              change_percent: 3,
            },
          },
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
  });

  it('renders Core report trends for risk drivers instead of a missing risk-history guard', () => {
    const { getByText, getAllByText, queryByText } = render(<RiskDetailScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.reportTrendBatch('risk-hypertension.blood_pressure', '30d'),
      expect.any(Function),
      { enabled: true },
    );
    expect(queryByText('Risk trend history unavailable')).toBeNull();
    expect(queryByText(/TRENDING UP/i)).toBeNull();
    expect(getByText('HIGH - CURRENT ESTIMATE')).toBeTruthy();
    expect(getByText('Existing report trends for the drivers that feed this risk score.')).toBeTruthy();
    expect(getAllByText('SYSTOLIC BP').length).toBeGreaterThan(0);
    expect(getByText('declining over 30d')).toBeTruthy();
    expect(getAllByText('driver sparkline').length).toBeGreaterThan(0);
  });

  it('maps risk factor labels to supported report trend metrics', () => {
    expect(riskFactorsToTrendMetrics([
      { label: 'SYSTOLIC_BP' },
      { label: 'DIASTOLIC_BP' },
      { label: 'BMI' },
      { label: 'PHYSICAL_ACTIVITY' },
    ])).toEqual(['blood_pressure', 'bmi', 'steps']);
  });
});
