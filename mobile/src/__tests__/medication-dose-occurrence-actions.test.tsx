/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { TakeMedConfirmScreen } from '../components/meds/take-med-confirm-screen';
import { MissedDoseScreen } from '../components/meds/missed-dose-screen';
import { MedicationDetailScreen } from '../components/meds/medication-detail-screen';
import { medicationService } from '../api/services';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
  useLocalSearchParams: jest.fn(() => mockParams),
}));

jest.mock('../api/services', () => ({
  medicationService: {
    markDoseDone: jest.fn(),
    skipDose: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
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
}));

jest.mock('../components/charts/progress-ring', () => ({
  ProgressRing: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockMarkDoseDone = medicationService.markDoseDone as jest.MockedFunction<typeof medicationService.markDoseDone>;
const mockSkipDose = medicationService.skipDose as jest.MockedFunction<typeof medicationService.skipDose>;

const morningDose = {
  occurrence_id: 'occ-morning',
  reminder_id: 'rem-morning',
  medication_plan_id: 'med-1',
  plan_name: 'Metformin',
  strength: '500 mg',
  scheduled_at: '2099-06-02T08:00:00.000Z',
  status: 'pending',
};

const eveningDose = {
  occurrence_id: 'occ-evening',
  reminder_id: 'rem-evening',
  medication_plan_id: 'med-1',
  plan_name: 'Metformin',
  strength: '500 mg',
  scheduled_at: '2099-06-02T20:00:00.000Z',
  status: 'pending',
};

const missedEveningDose = {
  ...eveningDose,
  status: 'missed',
};

const medicationDetail = {
  id: 'med-1',
  name: 'Metformin',
  generic_name: null,
  strength: '500 mg',
  form: 'tablet',
  instructions: null,
  prescriber: 'Dr Care',
  clinic: null,
  start_date: '2099-06-01',
  end_date: null,
  status: 'active',
  tzid: 'Asia/Ho_Chi_Minh',
  refill_supply_units: null,
  refill_cadence_days: null,
  last_refill_at: null,
  next_refill_estimated_at: null,
  review_due_at: null,
  appointment_id: null,
  notes: null,
  dose_count: 2,
  next_dose_at: '2099-06-02T08:00:00.000Z',
  doses: [
    { reminder_id: 'rem-morning', time: '08:00', repeat: 'daily', weekday_mask: null, day_of_month: null, next_occurrence_at: morningDose.scheduled_at, is_active: true },
    { reminder_id: 'rem-evening', time: '20:00', repeat: 'daily', weekday_mask: null, day_of_month: null, next_occurrence_at: eveningDose.scheduled_at, is_active: true },
  ],
};

const adherence = {
  period_days: 30,
  scheduled: 10,
  taken: 8,
  skipped: 1,
  missed: 1,
  snoozed_pending: 0,
  pending: 0,
  percent: 0.8,
};

function queryState(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'med-1' };
  mockUseLocalSearchParams.mockImplementation(() => mockParams as never);
  mockMarkDoseDone.mockResolvedValue({} as never);
  mockSkipDose.mockResolvedValue({} as never);
  mockUseApiQuery.mockImplementation((key) => {
    if (key === queryKeys.medicationDosesToday) return queryState([morningDose, eveningDose]) as never;
    if (key === queryKeys.medication('med-1')) return queryState({ detail: medicationDetail, adherence }) as never;
    return queryState(null) as never;
  });
});

describe('medication dose occurrence actions', () => {
  it('take route uses the exact occurrence instead of the first same-plan dose', async () => {
    mockParams = {
      id: 'med-1',
      occurrenceId: 'occ-evening',
      reminderId: 'rem-evening',
      scheduledAt: eveningDose.scheduled_at,
    };

    const { getByText } = render(<TakeMedConfirmScreen />);

    fireEvent.press(getByText('common.confirm'));

    await waitFor(() => expect(mockMarkDoseDone).toHaveBeenCalledWith('rem-evening', 'occ-evening'));
    expect(mockMarkDoseDone).not.toHaveBeenCalledWith('rem-morning', 'occ-morning');
  });

  it('take confirmation missed CTA opens the exact missed-dose occurrence route', async () => {
    mockParams = {
      id: 'med-1',
      occurrenceId: 'occ-evening',
      reminderId: 'rem-evening',
      scheduledAt: eveningDose.scheduled_at,
    };

    const { getByText } = render(<TakeMedConfirmScreen />);

    fireEvent.press(getByText('meds.missed'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    const destination = mockPush.mock.calls[0][0] as string;
    expect(destination.startsWith('/meds/med-1/missed?')).toBe(true);
    const params = new URLSearchParams(destination.split('?')[1]);
    expect(params.get('occurrenceId')).toBe('occ-evening');
    expect(params.get('reminderId')).toBe('rem-evening');
    expect(params.get('scheduledAt')).toBe(eveningDose.scheduled_at);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockMarkDoseDone).not.toHaveBeenCalled();
  });

  it('missed route skips the exact occurrence instead of the first same-plan dose', async () => {
    mockParams = {
      id: 'med-1',
      occurrenceId: 'occ-evening',
      reminderId: 'rem-evening',
      scheduledAt: missedEveningDose.scheduled_at,
    };
    mockUseApiQuery.mockReturnValue(queryState([morningDose, missedEveningDose]) as never);

    const { getByText } = render(<MissedDoseScreen />);

    fireEvent.press(getByText('I skipped this dose'));

    await waitFor(() => expect(mockSkipDose).toHaveBeenCalledWith('rem-evening', 'occ-evening'));
    expect(mockSkipDose).not.toHaveBeenCalledWith('rem-morning', 'occ-morning');
  });

  it('detail schedule action passes the matched occurrence id', async () => {
    const { getAllByText } = render(<MedicationDetailScreen />);

    fireEvent.press(getAllByText('meds.take')[1]);

    await waitFor(() => expect(mockMarkDoseDone).toHaveBeenCalledWith('rem-evening', 'occ-evening'));
    expect(mockMarkDoseDone).not.toHaveBeenCalledWith('rem-evening');
  });
});
