/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { Appointment } from '../../../shared/api-contracts';
import { CreateAppointmentScreen } from '../components/care/create-appointment-screen';
import { deriveRecentProviderSuggestions } from '../components/care/appointment-provider-suggestions-sheet';
import { appointmentService } from '../api/services';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'care.createAppointment': 'Create appointment',
        'care.bookNow': 'Book now',
        'care.loadingAppointments': 'Loading appointments',
        'care.appointmentsUnavailable': 'Appointments unavailable',
        'common.working': 'Working',
        'common.save': 'Save',
        'common.back': 'Back',
        'common.retry': 'Retry',
        'common.close': 'Close',
        'forms.category': 'Category',
        'forms.notes': 'Notes',
        'forms.optional': 'optional',
      };
      return labels[key] ?? key;
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../components/primitives/sheet/bottom-sheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
    visible ? <>{children}</> : null
  ),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../api/services', () => ({
  appointmentService: {
    create: jest.fn(),
    list: jest.fn(),
  },
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

const mockCreate = appointmentService.create as jest.MockedFunction<typeof appointmentService.create>;
const mockList = appointmentService.list as jest.MockedFunction<typeof appointmentService.list>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRouterBack = router.back as jest.MockedFunction<typeof router.back>;

const appointmentHistory: Appointment[] = [
  {
    id: 'apt-2',
    appointment_date: '2099-05-20T10:00:00.000Z',
    doctor_name: 'Dr History',
    specialty: 'Cardiology',
    clinic: 'Core Clinic',
    diagnosis: null,
    visit_type: 'in_person',
    video_join_url: null,
    status: 'completed',
    notes: null,
    has_prescription: false,
    prescription: null,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({
    id: 'apt-new',
    appointment_date: '2099-06-05T10:30:00.000Z',
    doctor_name: 'Dr History',
    specialty: 'Cardiology',
    clinic: 'Core Clinic',
    diagnosis: null,
    visit_type: 'video',
    video_join_url: null,
    status: 'scheduled',
    notes: null,
    has_prescription: false,
    prescription: null,
  });
  mockList.mockResolvedValue(appointmentHistory);
  mockUseApiQuery.mockReturnValue({
    data: appointmentHistory,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: jest.fn(),
  });
});

describe('CreateAppointmentScreen provider suggestions', () => {
  it('prefills provider fields from Core appointment history and books with the selected provider', async () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(<CreateAppointmentScreen />);

    fireEvent.press(getByText('Recent'));
    fireEvent.press(getByLabelText('Use Dr History'));
    fireEvent.changeText(getByPlaceholderText('e.g. Apr 28'), '2099-06-05');
    fireEvent.changeText(getByPlaceholderText('e.g. 2:00 PM'), '10:30');
    fireEvent.press(getByText('Book now'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        doctor_name: 'Dr History',
        specialty: 'Cardiology',
        clinic: 'Core Clinic',
        visit_type: 'video',
        video_join_url: null,
      }));
    });
    expect(mockUseApiQuery).toHaveBeenCalledWith(
      queryKeys.appointments,
      expect.any(Function),
      expect.objectContaining({ enabled: true }),
    );
    expect(mockInvalidateApiQuery).toHaveBeenCalledWith(queryKeys.appointments);
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('submits the meeting link for video appointments', async () => {
    const { getByPlaceholderText, getByText } = render(<CreateAppointmentScreen />);

    fireEvent.changeText(getByPlaceholderText('Doctor name'), 'Dr Video');
    fireEvent.changeText(getByPlaceholderText('e.g. Apr 28'), '2099-06-05');
    fireEvent.changeText(getByPlaceholderText('e.g. 2:00 PM'), '10:30');
    fireEvent.changeText(getByPlaceholderText('https://meet.example/room'), 'https://meet.example/room-123');
    fireEvent.press(getByText('Book now'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        doctor_name: 'Dr Video',
        visit_type: 'video',
        video_join_url: 'https://meet.example/room-123',
      }));
    });
  });

  it.each([
    ['http://meet.example/room-123'],
    ['ftp://meet.example/room-123'],
    ['mailto:doctor@example.test'],
    ['javascript:alert(1)'],
    ['/relative-room'],
  ])('rejects non-HTTPS video meeting link %s before saving', async (meetingUrl) => {
    const { getByPlaceholderText, getByText } = render(<CreateAppointmentScreen />);

    fireEvent.changeText(getByPlaceholderText('Doctor name'), 'Dr Video');
    fireEvent.changeText(getByPlaceholderText('e.g. Apr 28'), '2099-06-05');
    fireEvent.changeText(getByPlaceholderText('https://meet.example/room'), meetingUrl);
    fireEvent.press(getByText('Book now'));

    expect(getByText(meetingUrl.startsWith('/') ? 'Use an absolute meeting link.' : 'Use an https meeting link.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('deduplicates provider history by provider fields and sorts newest first', () => {
    const rows = deriveRecentProviderSuggestions([
      appointmentHistory[0],
      {
        ...appointmentHistory[0],
        id: 'apt-older',
        appointment_date: '2099-04-20T10:00:00.000Z',
      },
      {
        ...appointmentHistory[0],
        id: 'apt-other',
        appointment_date: '2099-06-20T10:00:00.000Z',
        doctor_name: 'Dr Later',
        specialty: 'Dermatology',
      },
    ]);

    expect(rows.map((row) => row.doctorName)).toEqual(['Dr Later', 'Dr History']);
    expect(rows[1].appointmentCount).toBe(2);
    expect(rows[1].lastAppointmentAt).toBe('2099-05-20T10:00:00.000Z');
  });
});
