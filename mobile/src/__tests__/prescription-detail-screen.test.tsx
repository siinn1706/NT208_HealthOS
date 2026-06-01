/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PrescriptionDetailScreen } from '../components/care/prescription-detail-screen';
import { useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'apt-1' }),
}));

jest.mock('../components/care/prescription-files-card', () => ({
  PrescriptionFilesCard: ({ appointmentId }: { appointmentId: string }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.Text, null, `Prescription files for ${appointmentId}`);
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
    notes: 'Take with food.',
    medicines: [
      { name: 'Amoxicillin', dosage: '500 mg', frequency: '2x daily', duration: '5 days', notes: null },
    ],
  },
};

describe('PrescriptionDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: appointmentWithPrescription,
    } as never);
  });

  it('renders verified prescription data without a fake pharmacy barcode', () => {
    const { getAllByText, getByText, queryByText } = render(<PrescriptionDetailScreen />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.appointment('apt-1'),
      expect.any(Function),
      { enabled: true },
    );
    expect(getAllByText('Amoxicillin').length).toBeGreaterThan(0);
    expect(getByText('500 mg')).toBeTruthy();
    expect(getByText('Take with food.')).toBeTruthy();
    expect(getByText('Prescription files for apt-1')).toBeTruthy();
    expect(getByText('meds.refill')).toBeTruthy();
    expect(queryByText('Show this code at pharmacy')).toBeNull();
  });
});
