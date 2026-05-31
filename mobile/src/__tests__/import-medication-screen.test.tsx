/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ImportMedicationScreen } from '../components/meds/import-medication-screen';
import { medicationService } from '../api/services';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../api/services', () => ({
  appointmentService: {
    detail: jest.fn(),
  },
  medicationService: {
    importFromAppointment: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
  invalidateApiQuery: jest.fn(),
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockImportFromAppointment = medicationService.importFromAppointment as jest.MockedFunction<typeof medicationService.importFromAppointment>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockRouterReplace = router.replace as jest.MockedFunction<typeof router.replace>;

const appointmentWithPrescription = {
  id: 'apt-1',
  appointment_date: '2099-06-02T09:00:00.000Z',
  doctor_name: 'Dr Care',
  specialty: 'Primary care',
  clinic: 'Clinic A',
  diagnosis: null,
  visit_type: 'in-person',
  status: 'completed',
  notes: null,
  has_prescription: true,
  prescription: {
    id: 'rx-1',
    issued_at: '2099-06-02T09:00:00.000Z',
    doctor: 'Dr Care',
    clinic: 'Clinic A',
    diagnosis: 'Checkup',
    notes: null,
    medicines: [
      { name: 'Amoxicillin', dosage: '500 mg', frequency: '2x daily', duration: '5 days', notes: null },
      { name: 'Ibuprofen', dosage: '200 mg', frequency: 'as needed', duration: '', notes: 'With food' },
    ],
  },
};

const importedPlan = {
  id: 'med-1',
  name: 'Ibuprofen',
  generic_name: null,
  strength: '200 mg',
  form: null,
  instructions: null,
  prescriber: 'Dr Care',
  clinic: 'Clinic A',
  start_date: '2099-06-02',
  end_date: null,
  status: 'active' as const,
  tzid: 'Asia/Ho_Chi_Minh',
  refill_supply_units: null,
  refill_cadence_days: null,
  last_refill_at: null,
  next_refill_estimated_at: null,
  review_due_at: null,
  appointment_id: 'apt-1',
  notes: null,
  dose_count: 1,
  next_dose_at: null,
};

function queryState(data: unknown, overrides: Record<string, unknown> = {}) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ appointmentId: 'apt-1' });
  mockUseApiQuery.mockReturnValue(queryState(appointmentWithPrescription) as never);
  mockImportFromAppointment.mockResolvedValue({ created: [importedPlan], skipped: [] });
});

describe('ImportMedicationScreen', () => {
  it('imports the selected prescription medicines through Core', async () => {
    const { getByLabelText, getByText } = render(<ImportMedicationScreen />);

    await waitFor(() => expect(getByText('Import 2 selected')).toBeTruthy());
    fireEvent.press(getByLabelText('Select Amoxicillin'));
    await waitFor(() => expect(getByText('Import 1 selected')).toBeTruthy());
    fireEvent.press(getByText('Import 1 selected'));

    await waitFor(() => {
      expect(mockImportFromAppointment).toHaveBeenCalledWith('apt-1', {
        default_dose_times: ['08:00'],
        default_repeat: 'daily',
        medicine_indices: [1],
      });
    });
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.medications);
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.medicationDosesToday);
    expect(getByText('Import complete')).toBeTruthy();
    expect(getByText('1 created, 0 skipped.')).toBeTruthy();

    fireEvent.press(getByText('View medications'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/meds');
  });

  it('shows an explicit empty state when the appointment has no prescription medicines', () => {
    mockUseApiQuery.mockReturnValue(queryState({
      ...appointmentWithPrescription,
      prescription: { ...appointmentWithPrescription.prescription, medicines: [] },
    }) as never);

    const { getByText } = render(<ImportMedicationScreen />);

    expect(getByText('No prescription medicines')).toBeTruthy();
    expect(getByText('This appointment has no verified prescription medicines to import.')).toBeTruthy();
  });
});
