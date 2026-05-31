/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppointmentsScreen } from '../components/care/appointments-screen';
import { useApiQuery } from '../api/query';
import { router } from 'expo-router';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number; day?: number }) => {
      const labels: Record<string, string> = {
        'care.upcoming': 'Upcoming',
        'care.past': 'Past',
        'care.all': 'All',
        'care.appointments': 'Appointments',
        'care.thisWeek': 'This week',
        'care.createAppointment': 'Create appointment',
        'care.bookAppointmentCta': 'Book appointment',
        'care.noAppointments': 'No appointments',
        'common.filter': 'Filter',
      };
      if (key === 'care.upcomingCount') return `${params?.count ?? 0} upcoming`;
      if (key === 'care.pastCount') return `${params?.count ?? 0} past`;
      if (key === 'care.dayN') return `Day ${params?.day}`;
      return labels[key] ?? key;
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('AppointmentsScreen prep route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens prep for the next eligible appointment instead of a literal new id', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: [
        {
          id: 'apt-later',
          appointment_date: '2099-06-03T10:00:00.000Z',
          doctor_name: 'Dr Later',
          specialty: 'Cardiology',
          clinic: 'Clinic B',
          diagnosis: null,
          status: 'scheduled',
          notes: null,
          has_prescription: false,
          prescription: null,
        },
        {
          id: 'apt-next',
          appointment_date: '2099-06-02T09:00:00.000Z',
          doctor_name: 'Dr Prep',
          specialty: 'Primary care',
          clinic: 'Clinic A',
          diagnosis: null,
          status: 'upcoming',
          notes: null,
          has_prescription: false,
          prescription: null,
        },
      ],
    } as never);

    const { getByText } = render(<AppointmentsScreen />);

    expect(getByText('AI-generated questions for Dr Prep')).toBeTruthy();
    fireEvent.press(getByText('View questions'));

    expect(mockRouterPush).toHaveBeenCalledWith('/care/prep/apt-next');
    expect(mockRouterPush).not.toHaveBeenCalledWith('/care/prep/new');
  });

  it('does not render the prep CTA without an eligible upcoming appointment', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: [
        {
          id: 'apt-past',
          appointment_date: '2020-06-02T09:00:00.000Z',
          doctor_name: 'Dr Past',
          specialty: 'Primary care',
          clinic: 'Clinic A',
          diagnosis: null,
          status: 'completed',
          notes: null,
          has_prescription: false,
          prescription: null,
        },
      ],
    } as never);

    const { queryByText } = render(<AppointmentsScreen />);

    expect(queryByText('View questions')).toBeNull();
  });
});
