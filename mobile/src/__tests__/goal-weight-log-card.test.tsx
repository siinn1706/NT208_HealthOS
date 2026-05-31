/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { GoalWeightLogCard } from '../components/insights/goals/goal-weight-log-card';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { healthMetricService } from '../api/services/health-metric-service';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../api/services/health-metric-service', () => ({
  healthMetricService: {
    create: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

const mockCreate = healthMetricService.create as jest.MockedFunction<typeof healthMetricService.create>;
const mockInvalidate = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({
    id: 'metric-1',
    user_id: 'user-1',
    metric_type: 'weight_kg',
    value: 70.5,
    unit: 'kg',
    recorded_at: '2026-05-31T10:00:00.000Z',
    source: 'manual',
  });
});

describe('GoalWeightLogCard', () => {
  it('saves a manual Core weight metric and refreshes goal progress data', async () => {
    const onSaved = jest.fn();
    const { getByLabelText, getByText } = render(<GoalWeightLogCard onSaved={onSaved} />);

    fireEvent.changeText(getByLabelText('Weight'), '70.5');
    fireEvent.press(getByText('Save weight'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      metric_type: 'weight_kg',
      value: 70.5,
      unit: 'kg',
      recorded_at: expect.any(String),
    }));
    expect(mockInvalidate).toHaveBeenCalledWith(queryKeys.healthGoalProgress('weight_kg', '7d'));
    expect(mockInvalidate).toHaveBeenCalledWith(queryKeys.healthGoalProgress('weight_kg', '30d'));
    expect(mockInvalidate).toHaveBeenCalledWith(queryKeys.dashboard);
    expect(mockInvalidate).toHaveBeenCalledWith('reports');
    expect(mockInvalidate).toHaveBeenCalledWith('risk');
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(getByText('Saved 70.5 kg.')).toBeTruthy();
  });

  it('blocks out-of-range weights before calling Core', async () => {
    const { getByLabelText, getByText } = render(<GoalWeightLogCard />);

    fireEvent.changeText(getByLabelText('Weight'), '501');
    fireEvent.press(getByText('Save weight'));

    await waitFor(() => expect(getByText('Weight must be 1-500 kg.')).toBeTruthy());
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
