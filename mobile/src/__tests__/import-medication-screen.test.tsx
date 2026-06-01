/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ImportMedicationScreen } from '../components/meds/import-medication-screen';
import { appointmentService, medicationService } from '../api/services';
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
    list: jest.fn(),
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
const mockAppointmentDetail = appointmentService.detail as jest.MockedFunction<typeof appointmentService.detail>;
const mockAppointmentList = appointmentService.list as jest.MockedFunction<typeof appointmentService.list>;
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
  visit_type: 'in_person',
  video_join_url: null,
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
  pause_until: null,
  pause_reason: null,
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

const appointmentWithoutPrescription = {
  ...appointmentWithPrescription,
  id: 'apt-empty',
  doctor_name: 'Dr No Rx',
  has_prescription: false,
  prescription: null,
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
  mockAppointmentDetail.mockResolvedValue(appointmentWithPrescription as never);
  mockAppointmentList.mockResolvedValue([appointmentWithPrescription, appointmentWithoutPrescription] as never);
  mockImportFromAppointment.mockResolvedValue({ created: [importedPlan], skipped: [] });
});

describe('ImportMedicationScreen', () => {
  it('discovers prescription appointments from Core when no appointment id is provided', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseApiQuery.mockImplementation((key, queryFn) => {
      if (key === queryKeys.appointments) {
        void queryFn();
        return queryState([appointmentWithoutPrescription, appointmentWithPrescription]) as never;
      }
      void queryFn();
      return queryState(appointmentWithPrescription) as never;
    });

    const { getByLabelText, getByText, queryByText } = render(<ImportMedicationScreen />);

    await waitFor(() => expect(mockAppointmentList).toHaveBeenCalledTimes(1));
    expect(queryByText('Prescription source API not yet available.')).toBeNull();
    expect(queryByText('Pending prescription import API not yet available.')).toBeNull();
    expect(getByText('Amoxicillin')).toBeTruthy();
    expect(queryByText('Dr No Rx')).toBeNull();

    fireEvent.press(getByLabelText('Select prescription source Dr Care'));

    await waitFor(() => expect(mockAppointmentDetail).toHaveBeenCalledWith('apt-1'));
    expect(getByText('Import 2 selected')).toBeTruthy();
  });

  it('shows a retryable source discovery error', () => {
    const reload = jest.fn();
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseApiQuery.mockImplementation((key, queryFn) => {
      if (key === queryKeys.appointments) {
        void queryFn();
        return queryState(null, { error: new Error('Appointments down'), reload }) as never;
      }
      return queryState(appointmentWithPrescription) as never;
    });

    const { getByText } = render(<ImportMedicationScreen />);

    expect(getByText('meds.prescriptionSourcesUnavailable')).toBeTruthy();
    expect(getByText('Appointments down')).toBeTruthy();
    fireEvent.press(getByText('common.retry'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when Core has no prescription sources', () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseApiQuery.mockImplementation((key, queryFn) => {
      if (key === queryKeys.appointments) {
        void queryFn();
        return queryState([appointmentWithoutPrescription]) as never;
      }
      return queryState(appointmentWithPrescription) as never;
    });

    const { getByText } = render(<ImportMedicationScreen />);

    expect(getByText('meds.noPrescriptionSources')).toBeTruthy();
    expect(getByText('meds.noPrescriptionSourcesMessage')).toBeTruthy();
  });

  it('keeps add-medication alternatives limited to implemented flows', () => {
    const { getByText, queryByText } = render(<ImportMedicationScreen />);

    expect(queryByText('meds.scanPrescription')).toBeNull();
    expect(queryByText('meds.searchDrugDatabase')).toBeNull();
    expect(queryByText('Prescription scanner not yet available.')).toBeNull();
    expect(queryByText('Drug database search not yet available.')).toBeNull();

    fireEvent.press(getByText('meds.enterManually'));
    expect(router.push).toHaveBeenCalledWith('/meds/add');
  });

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
