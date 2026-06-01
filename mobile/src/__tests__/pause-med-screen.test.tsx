/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PauseMedScreen } from '../components/meds/pause-med-screen';
import { medicationService } from '../api/services';
import { invalidateApiQuery } from '../api/query';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
  },
  useLocalSearchParams: () => ({ id: 'med-1' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../api/services', () => ({
  medicationService: {
    pause: jest.fn(),
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
}));

const mockPause = medicationService.pause as jest.MockedFunction<typeof medicationService.pause>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

beforeEach(() => {
  jest.clearAllMocks();
  mockPause.mockResolvedValue({
    id: 'med-1',
    name: 'Metformin',
    generic_name: null,
    strength: null,
    form: null,
    instructions: null,
    prescriber: null,
    clinic: null,
    start_date: '2026-06-01',
    end_date: null,
    status: 'paused',
    pause_until: null,
    pause_reason: null,
    tzid: 'Asia/Ho_Chi_Minh',
    refill_supply_units: null,
    refill_cadence_days: null,
    last_refill_at: null,
    next_refill_estimated_at: null,
    review_due_at: null,
    appointment_id: null,
    notes: null,
    dose_count: 0,
    next_dose_at: null,
  });
});

describe('PauseMedScreen', () => {
  it('submits selected duration and reason to Core', async () => {
    const { getByText, getByPlaceholderText } = render(<PauseMedScreen />);

    fireEvent.press(getByText('meds.pauseThreeDays'));
    fireEvent.changeText(getByPlaceholderText('meds.pauseReasonPlaceholder'), '  travel  ');
    fireEvent.press(getByText('meds.pause'));

    await waitFor(() => expect(mockPause).toHaveBeenCalledWith('med-1', {
      pause_until: expect.any(String),
      pause_reason: 'travel',
    }));
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('medications.list');
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith('medications.detail.med-1');
    expect(mockBack).toHaveBeenCalled();
  });

  it('blocks invalid custom resume dates before calling Core', () => {
    const { getByText } = render(<PauseMedScreen />);

    fireEvent.press(getByText('meds.pauseCustom'));
    fireEvent.press(getByText('meds.pause'));

    expect(getByText('meds.pauseCustomDateRequired')).toBeTruthy();
    expect(mockPause).not.toHaveBeenCalled();
  });
});
