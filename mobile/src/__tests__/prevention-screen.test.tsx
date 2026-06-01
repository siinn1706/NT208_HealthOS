/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PreventionScreen } from '../components/insights/risk/prevention-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { planService } from '../api/services';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  riskService: { summary: jest.fn() },
  planService: {
    findActiveByCategory: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
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
const mockPlanService = planService as jest.Mocked<typeof planService>;

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
              tips: [{ id: 'tip-sodium', priority: 'high', title: 'reduce sodium', description: 'choose low salt meals' }],
            }],
          },
        } as never;
      }
      if (key === queryKeys.preventionPlans) {
        return { ...baseQueryState, data: null } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });
    mockPlanService.create.mockResolvedValue({
      id: 'plan-1',
      category: 'risk_prevention',
      items: [],
    } as never);
    mockPlanService.update.mockResolvedValue({ id: 'plan-1' } as never);
    mockPlanService.findActiveByCategory.mockResolvedValue(null as never);
  });

  it('derives prevention cards from Core risk tips and creates a generic prevention plan item', async () => {
    const { getByText, queryByLabelText } = render(<PreventionScreen />);

    expect(getByText('Reduce Sodium')).toBeTruthy();
    expect(getByText('Choose Low Salt Meals')).toBeTruthy();
    expect(queryByLabelText('Filter prevention actions')).toBeNull();

    fireEvent.press(getByText('Start'));

    await waitFor(() => expect(mockPlanService.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Prevention plan',
      category: 'risk_prevention',
      items: [expect.objectContaining({
        id: 'tip-sodium',
        source: 'risk_prediction_tip',
        status: 'started',
        title: 'Reduce Sodium',
      })],
    })));
    expect(getByText('Reduce Sodium saved to your prevention plan.')).toBeTruthy();
  });

  it('uses category chips as the real filter control instead of a header no-op', () => {
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.riskSummary) {
        return {
          ...baseQueryState,
          data: {
            risks: [
              {
                id: 'risk-hypertension',
                condition: 'hypertension',
                level: 'high',
                probability: 0.62,
                tips: [{ id: 'tip-sodium', priority: 'high', title: 'reduce sodium', description: 'choose low salt meals' }],
              },
              {
                id: 'risk-inactivity',
                condition: 'inactivity',
                level: 'moderate',
                probability: 0.41,
                tips: [{ id: 'tip-walk', priority: 'medium', title: 'walk daily', description: 'add a short walk' }],
              },
            ],
          },
        } as never;
      }
      if (key === queryKeys.preventionPlans) {
        return { ...baseQueryState, data: null } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });

    const { getByText, queryByText, queryByLabelText } = render(<PreventionScreen />);

    expect(queryByLabelText('Filter prevention actions')).toBeNull();
    expect(getByText('Reduce Sodium')).toBeTruthy();
    expect(getByText('Walk Daily')).toBeTruthy();

    fireEvent.press(getByText('Activity'));

    expect(queryByText('Reduce Sodium')).toBeNull();
    expect(getByText('Walk Daily')).toBeTruthy();
  });

  it('shows started status for an existing generic prevention plan item', () => {
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
              tips: [{ id: 'tip-sodium', priority: 'high', title: 'reduce sodium', description: 'choose low salt meals' }],
            }],
          },
        } as never;
      }
      if (key === queryKeys.preventionPlans) {
        return {
          ...baseQueryState,
          data: {
            id: 'plan-1',
            category: 'risk_prevention',
            status: 'active',
            archived_at: null,
            items: [{ id: 'tip-sodium', source: 'risk_prediction_tip', status: 'started' }],
          },
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });

    const { getByText } = render(<PreventionScreen />);

    expect(getByText('Started')).toBeTruthy();
  });

  it('refetches the latest generic plan before patching full items', async () => {
    mockPlanService.findActiveByCategory.mockResolvedValueOnce({
      id: 'plan-1',
      category: 'risk_prevention',
      status: 'active',
      archived_at: null,
      items: [{ id: 'tip-walk', source: 'risk_prediction_tip', status: 'started' }],
    } as never);

    const { getByText } = render(<PreventionScreen />);

    fireEvent.press(getByText('Start'));

    await waitFor(() => expect(mockPlanService.update).toHaveBeenCalledWith('plan-1', expect.objectContaining({
      category: 'risk_prevention',
      items: [
        expect.objectContaining({ id: 'tip-walk' }),
        expect.objectContaining({ id: 'tip-sodium', status: 'started' }),
      ],
    })));
    expect(mockPlanService.create).not.toHaveBeenCalled();
  });
});
