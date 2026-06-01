/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { CareHubScreen } from '../components/care/care-hub-screen';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.View, null, children);
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({ name: 'calm' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number; date?: string }) => {
      const labels: Record<string, string> = {
        'care.title': 'Care',
        'care.subtitle': 'Appointments',
        'care.appointments': 'Appointments',
        'care.medicalHistory': 'Medical History',
        'care.mealsNutrition': 'Meals & Nutrition',
        'care.labReports': 'Lab Reports',
        'care.prescriptions': 'Prescriptions',
        'care.scanMeal': 'Scan a meal',
        'care.bookAppointment': 'Book appointment',
        'care.viewActivePrescriptions': 'View active prescriptions',
        'care.aiPoweredFoodScan': 'AI-powered food scan',
        'care.scheduleConsultation': 'Schedule consultation',
        'care.dailyNutritionLogs': 'Daily nutrition logs',
        'care.viewTestResults': 'View test results',
        'care.quickAccess': 'Quick access',
        'care.noUpcomingAppointment': 'No upcoming appointment',
        'care.bookConsultation': 'Book consultation',
        'care.join': 'Join',
        'care.prep': 'Prep',
        'care.details': 'Details',
        'care.bookNow': 'Book now',
        'care.general': 'General',
        'care.loadingCareSummary': 'Loading care summary',
        'care.careSummaryUnavailable': 'Care summary unavailable',
        'common.new': 'New',
      };
      if (key === 'care.upcomingCount') return `${params?.count ?? 0} upcoming`;
      if (key === 'care.lastVisit') return `Last ${params?.date ?? ''}`;
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

function appointment(overrides: Record<string, unknown>) {
  return {
    id: 'apt-1',
    appointment_date: '2099-06-02T09:00:00.000Z',
    doctor_name: 'Dr Care',
    specialty: 'Primary care',
    clinic: 'Clinic A',
    diagnosis: null,
    visit_type: 'in_person',
    video_join_url: null,
    status: 'scheduled',
    notes: null,
    has_prescription: false,
    prescription: null,
    ...overrides,
  };
}

describe('CareHubScreen appointment hero routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes video Join and Prep to the current appointment action routes', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: [appointment({
        id: 'apt-video',
        visit_type: 'video',
        video_join_url: 'https://meet.example/room',
      })],
    } as never);

    const { getByText } = render(<CareHubScreen />);

    fireEvent.press(getByText('Join'));
    expect(mockRouterPush).toHaveBeenCalledWith('/care/video/apt-video');

    fireEvent.press(getByText('Prep'));
    expect(mockRouterPush).toHaveBeenCalledWith('/care/prep/apt-video');
  });

  it('routes non-video primary CTA to appointment detail instead of the appointment list', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: [appointment({ id: 'apt-in-person' })],
    } as never);

    const { getByText, queryByText } = render(<CareHubScreen />);

    expect(queryByText('Join')).toBeNull();
    fireEvent.press(getByText('Details'));

    expect(mockRouterPush).toHaveBeenCalledWith('/care/appointment/apt-in-person');
    expect(mockRouterPush).not.toHaveBeenCalledWith('/care/appointments');
  });
});
