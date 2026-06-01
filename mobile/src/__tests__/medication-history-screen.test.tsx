/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { MedicationHistoryScreen } from '../components/meds/medication-history-screen';
import { useApiQuery } from '../api/query';
import type { MedicationDoseHistory, MedicationPlan } from '../../../shared/api-contracts';

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

function queryState(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: Array.isArray(data) && data.length === 0,
    reload: jest.fn(),
  } as never;
}

describe('MedicationHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockReturnValue(queryState([]));
  });

  it('does not render a filter button without a supported filter action', () => {
    const { getByLabelText, queryByLabelText } = render(<MedicationHistoryScreen />);

    expect(getByLabelText('common.back')).toBeTruthy();
    expect(queryByLabelText('common.filter')).toBeNull();
  });

  it('renders contract-backed dose history instead of fake unavailable history', () => {
    const plans: MedicationPlan[] = [
      medicationPlan({ id: 'active-1', status: 'active' }),
      medicationPlan({ id: 'paused-1', name: 'Paused med', status: 'paused' }),
      medicationPlan({ id: 'done-1', name: 'Completed med', status: 'completed' }),
      medicationPlan({ id: 'cancelled-1', name: 'Cancelled med', status: 'cancelled' }),
    ];
    const doses: MedicationDoseHistory[] = [
      {
        occurrence_id: 'occ-1',
        reminder_id: 'rem-1',
        medication_plan_id: 'active-1',
        plan_name: 'Metformin',
        strength: '500 mg',
        scheduled_at: '2026-05-31T08:00:00.000Z',
        status: 'done',
        done_at: '2026-05-31T08:01:00.000Z',
        skipped_at: null,
        snoozed_until: null,
      },
    ];
    mockUseApiQuery.mockImplementation((key) => (
      String(key).startsWith('medications.history.')
        ? queryState(doses)
        : queryState(plans)
    ));

    const { getByText, queryByText } = render(<MedicationHistoryScreen />);

    expect(getByText('Archived')).toBeTruthy();
    expect(getByText('Paused')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
    expect(getByText('Recent doses')).toBeTruthy();
    expect(getByText('Metformin')).toBeTruthy();
    expect(getByText('Taken')).toBeTruthy();
    expect(queryByText('Dose history unavailable')).toBeNull();
    expect(queryByText('80%')).toBeNull();
    expect(queryByText('Missed')).toBeNull();
  });
});

function medicationPlan(overrides: Partial<MedicationPlan>): MedicationPlan {
  return {
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
    refill_supply_units: null,
    refill_cadence_days: null,
    last_refill_at: null,
    next_refill_estimated_at: null,
    review_due_at: null,
    appointment_id: null,
    notes: null,
    dose_count: 1,
    next_dose_at: null,
    ...overrides,
  };
}
