/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import MedsScreen from '../../app/(tabs)/meds';
import { useApiQuery } from '../api/query';
import { medicationService } from '../api/services';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Adherence, MedicationDose, MedicationPlan } from '../../../shared/api-contracts';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
      ReactActual.createElement(View, { style }, children)
    ),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => (
    key === 'meds.activeAdherence' ? `${params?.count ?? 0} active` : key
  ) }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  medicationService: {
    list: jest.fn(),
    today: jest.fn(),
    adherence: jest.fn(),
    markDoseDone: jest.fn(),
  },
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockMedicationService = medicationService as jest.Mocked<typeof medicationService>;

let capturedLoadMeds: (() => Promise<{
  plans: MedicationPlan[];
  doses: MedicationDose[];
  adherenceRecord: Record<string, Adherence>;
}>) | null = null;

function medicationPlan(overrides: Partial<MedicationPlan> = {}): MedicationPlan {
  return {
    id: 'med-1',
    name: 'Demo med',
    generic_name: null,
    strength: '10mg',
    form: null,
    instructions: null,
    prescriber: null,
    clinic: null,
    start_date: '2026-06-01',
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

describe('MedsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedLoadMeds = null;
    mockUseApiQuery.mockImplementation((_key, queryFn) => {
      capturedLoadMeds = queryFn as typeof capturedLoadMeds;
      return {
        data: { plans: [], doses: [], adherenceRecord: {} },
        error: null,
        isLoading: false,
        isRefreshing: false,
        isEmpty: false,
        reload: jest.fn(),
      };
    });
  });

  it('throws medication list failures so useApiQuery can preserve stale cached data', async () => {
    mockMedicationService.list.mockRejectedValueOnce(new Error('offline'));
    mockMedicationService.today.mockResolvedValueOnce([]);

    render(<MedsScreen />);

    await expect(capturedLoadMeds?.()).rejects.toThrow('offline');
  });

  it('keeps optional adherence failures from failing the whole meds screen', async () => {
    const plan = medicationPlan();
    mockMedicationService.list.mockResolvedValueOnce([plan]);
    mockMedicationService.today.mockResolvedValueOnce([]);
    mockMedicationService.adherence.mockRejectedValueOnce(new Error('adherence unavailable'));

    render(<MedsScreen />);

    await expect(capturedLoadMeds?.()).resolves.toEqual({
      plans: [plan],
      doses: [],
      adherenceRecord: {},
    });
  });

  it('keeps active plans when today doses fail', async () => {
    const plan = medicationPlan();
    const adherence: Adherence = {
      period_days: 30,
      scheduled: 8,
      taken: 7,
      skipped: 1,
      missed: 0,
      snoozed_pending: 0,
      pending: 0,
      percent: 0.875,
    };
    mockMedicationService.list.mockResolvedValueOnce([plan]);
    mockMedicationService.today.mockRejectedValueOnce(new Error('today unavailable'));
    mockMedicationService.adherence.mockResolvedValueOnce(adherence);

    render(<MedsScreen />);

    await expect(capturedLoadMeds?.()).resolves.toEqual({
      plans: [plan],
      doses: [],
      adherenceRecord: { [plan.id]: adherence },
    });
  });
});
