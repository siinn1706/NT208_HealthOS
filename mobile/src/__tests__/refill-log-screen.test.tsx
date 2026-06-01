/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { RefillLogScreen } from '../components/meds/refill-log-screen';
import { medicationService } from '../api/services';
import { useApiQuery } from '../api/query';
import type { MedicationPlanDetail } from '../../../shared/api-contracts';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'meds.unitsCount') return `${options?.count ?? 0} units`;
      if (key === 'meds.daysCount') return `${options?.count ?? 0} days`;
      if (key === 'meds.logRefillConfirmMessage') return `confirm ${options?.count ?? ''}`;
      return key;
    },
  }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../api/services', () => ({
  medicationService: {
    detail: jest.fn(),
    refill: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRefill = medicationService.refill as jest.MockedFunction<typeof medicationService.refill>;

const medicationDetail: MedicationPlanDetail = {
  id: 'med-1',
  name: 'Metformin',
  generic_name: null,
  strength: '500 mg',
  form: 'tablet',
  instructions: null,
  prescriber: null,
  clinic: null,
  start_date: '2026-05-30',
  end_date: null,
  status: 'active',
  pause_until: null,
  pause_reason: null,
  tzid: 'Asia/Ho_Chi_Minh',
  refill_supply_units: 42,
  refill_cadence_days: 30,
  last_refill_at: '2099-01-15T08:30:00.000Z',
  next_refill_estimated_at: '2099-02-14T08:30:00.000Z',
  review_due_at: null,
  appointment_id: null,
  notes: null,
  dose_count: 1,
  next_dose_at: null,
  doses: [],
};

describe('RefillLogScreen', () => {
  function mockMedication(data: typeof medicationDetail) {
    mockUseApiQuery.mockReturnValue({
      data,
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: false,
      reload: jest.fn(),
    } as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'med-1' });
    mockMedication(medicationDetail);
    mockRefill.mockResolvedValue(medicationDetail);
  });

  it('renders refill status from the medication detail payload', () => {
    const { getByText, queryByText } = render(<RefillLogScreen />);

    expect(getByText('meds.refillStatus')).toBeTruthy();
    expect(getByText('42 units')).toBeTruthy();
    expect(getByText('30 days')).toBeTruthy();
    expect(queryByText('Refill history API not yet available.')).toBeNull();
  });

  it('treats zero supply as tracked and running low', () => {
    mockMedication({ ...medicationDetail, refill_supply_units: 0 });

    const { getAllByText, getByText, queryByText } = render(<RefillLogScreen />);

    expect(getByText('0 units')).toBeTruthy();
    expect(getByText('meds.runningLow')).toBeTruthy();
    expect(queryByText('meds.requestRefill')).toBeNull();

    fireEvent.press(getAllByText('meds.logRefill')[0]);
    expect(getByText('meds.logRefillConfirm')).toBeTruthy();
  });

  it('renders null supply as not tracked without a low-supply alert', () => {
    mockMedication({ ...medicationDetail, refill_supply_units: null });

    const { getByText, queryByText } = render(<RefillLogScreen />);

    expect(getByText('meds.notTracked')).toBeTruthy();
    expect(queryByText('meds.runningLow')).toBeNull();
  });

  it('does not submit invalid refill units', () => {
    const { getAllByText, getByPlaceholderText, getByText } = render(<RefillLogScreen />);

    fireEvent.changeText(getByPlaceholderText('42'), '12abc');
    fireEvent.press(getAllByText('meds.logRefill').at(-1)!);

    expect(getByText('meds.refillUnitsInvalid')).toBeTruthy();
    expect(mockRefill).not.toHaveBeenCalled();
  });

  it('submits strict whole-number refill units', async () => {
    const { getAllByText, getByPlaceholderText, getByText } = render(<RefillLogScreen />);

    fireEvent.changeText(getByPlaceholderText('42'), '12');
    fireEvent.press(getAllByText('meds.logRefill').at(-1)!);
    fireEvent.press(getByText('common.confirm'));

    await waitFor(() => expect(mockRefill).toHaveBeenCalledWith('med-1', 12));
  });
});
