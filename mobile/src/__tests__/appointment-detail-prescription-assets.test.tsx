/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { AppointmentDetailScreen } from '../components/care/appointment-detail-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'apt-1' }),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

jest.mock('../components/primitives/sheet/bottom-sheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));

jest.mock('../components/care/appointment-reschedule-sheet', () => ({
  AppointmentRescheduleSheet: () => null,
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

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

const appointmentWithPrescription = {
  id: 'apt-1',
  appointment_date: '2099-06-02T09:00:00.000Z',
  doctor_name: 'Dr Care',
  specialty: 'Primary care',
  clinic: 'Clinic A',
  diagnosis: null,
  visit_type: 'in-person',
  status: 'completed' as const,
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
    ],
  },
};

describe('AppointmentDetailScreen prescription assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders prescription files through the existing Core asset contract', () => {
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.appointment('apt-1')) {
        return { ...baseQueryState, data: appointmentWithPrescription } as never;
      }
      if (key === queryKeys.prescriptionAssets('apt-1')) {
        return {
          ...baseQueryState,
          data: [{
            id: 'asset-1',
            appointment_id: 'apt-1',
            mime_type: 'application/pdf',
            size_bytes: 1200,
            sha256: 'abc',
            original_filename: 'rx.pdf',
            uploaded_at: '2099-06-02T10:00:00.000Z',
          }],
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });

    const { getByText, queryByText } = render(<AppointmentDetailScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.prescriptionAssets('apt-1'),
      expect.any(Function),
      { enabled: true },
    );
    expect(mockUseApiQuery.mock.calls.filter(([key]) => key === queryKeys.prescriptionAssets('apt-1'))).toHaveLength(1);
    expect(queryByText('General appointment attachments unavailable')).toBeNull();
    expect(queryByText('Appointment attachments unavailable')).toBeNull();
    expect(getByText('rx.pdf')).toBeTruthy();
    expect(getByText('application/pdf | 1 KB')).toBeTruthy();
    expect(getByText('Upload prescription file')).toBeTruthy();
  });

  it('keeps generic appointment attachments guarded when there is no backend contract', () => {
    mockUseApiQuery.mockImplementation((key) => {
      if (key === queryKeys.appointment('apt-1')) {
        return {
          ...baseQueryState,
          data: {
            ...appointmentWithPrescription,
            has_prescription: false,
            prescription: null,
          },
        } as never;
      }
      return { ...baseQueryState, data: null } as never;
    });

    const { getByText, queryByText } = render(<AppointmentDetailScreen />);

    expect(getByText('Appointment attachments unavailable')).toBeTruthy();
    expect(getByText(/Generic appointment upload\/storage API is not implemented/i)).toBeTruthy();
    expect(queryByText('Upload prescription file')).toBeNull();
    expect(mockUseApiQuery).not.toHaveBeenCalledWith(
      queryKeys.prescriptionAssets('apt-1'),
      expect.any(Function),
      expect.anything(),
    );
  });
});
