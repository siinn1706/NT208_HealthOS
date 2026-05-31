/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { VitalsManualEntryCard } from '../components/home/vitals-manual-entry-card';
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
    metric_type: 'heart_rate',
    value: 72,
    unit: 'bpm',
    recorded_at: '2026-05-31T10:00:00.000Z',
    source: 'manual',
  });
});

describe('VitalsManualEntryCard', () => {
  it('saves manual heart rate and blood pressure readings to Core', async () => {
    const { getByLabelText, getByText } = render(<VitalsManualEntryCard />);

    fireEvent.changeText(getByLabelText('Heart rate'), '72');
    fireEvent.changeText(getByLabelText('Systolic'), '120');
    fireEvent.changeText(getByLabelText('Diastolic'), '80');
    fireEvent.press(getByText('Save readings'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(3));
    expect(mockCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      metric_type: 'heart_rate',
      value: 72,
      unit: 'bpm',
      recorded_at: expect.any(String),
    }));
    expect(mockCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      metric_type: 'blood_pressure_systolic',
      value: 120,
      unit: 'mmHg',
      recorded_at: expect.any(String),
    }));
    expect(mockCreate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      metric_type: 'blood_pressure_diastolic',
      value: 80,
      unit: 'mmHg',
      recorded_at: expect.any(String),
    }));
    expect(mockInvalidate).toHaveBeenCalledWith(queryKeys.dashboard);
    expect(mockInvalidate).toHaveBeenCalledWith('reports');
    expect(mockInvalidate).toHaveBeenCalledWith('risk');
    expect(getByText('Saved 3 readings.')).toBeTruthy();
  });

  it('blocks incomplete blood pressure before calling Core', async () => {
    const { getByLabelText, getByText } = render(<VitalsManualEntryCard />);

    fireEvent.changeText(getByLabelText('Systolic'), '120');
    fireEvent.press(getByText('Save readings'));

    await waitFor(() => expect(getByText('Enter both systolic and diastolic pressure.')).toBeTruthy());
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
