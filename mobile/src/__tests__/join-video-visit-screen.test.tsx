/* eslint-env jest */
import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { JoinVideoVisitScreen } from '../components/care/join-video-visit-screen';
import { useApiQuery } from '../api/query';
import { router } from 'expo-router';
import { safeOpenUrl } from '../utils/safe-url';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../utils/safe-url', () => ({
  safeOpenUrl: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'apt-1' }),
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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'care.joinVideoVisit': 'Join video visit',
      'care.noAppointments': 'No appointments',
      'care.appointmentNotFoundMessage': 'No appointment found for this id.',
      'care.videoVisitLinkUnavailable': 'Video link unavailable',
      'care.videoVisitLinkUnavailableMessage': 'Add a meeting link to this video appointment before joining.',
      'care.videoVisitUnavailableForAppointment': 'No video visit for this appointment',
      'care.videoVisitUnavailableMessage': 'This appointment is not marked as a video visit.',
      'care.videoVisitOpenFailed': 'Could not open video visit link',
      'care.openVideoVisitLink': 'Open video visit link',
      'common.back': 'Back',
      'common.retry': 'Retry',
    }[key] ?? key),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;
const mockSafeOpenUrl = safeOpenUrl as jest.MockedFunction<typeof safeOpenUrl>;
const mockOpenURL = jest.spyOn(Linking, 'openURL');

const baseQueryState = {
  error: null,
  isLoading: false,
  isRefreshing: false,
  isEmpty: false,
  reload: jest.fn(),
};

describe('JoinVideoVisitScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: {
        id: 'apt-1',
        appointment_date: '2099-06-02T09:00:00.000Z',
        doctor_name: 'Dr Video',
        specialty: 'Virtual care',
        clinic: 'Video visit',
        diagnosis: null,
        visit_type: 'video',
        status: 'scheduled',
        notes: null,
        video_join_url: null,
        has_prescription: false,
        prescription: null,
      },
    } as never);
    mockSafeOpenUrl.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined);
  });

  it('shows a truthful unavailable state when a video appointment has no meeting link', () => {
    const { getByText, queryByText } = render(<JoinVideoVisitScreen />);

    expect(getByText('Video link unavailable')).toBeTruthy();
    expect(getByText('Add a meeting link to this video appointment before joining.')).toBeTruthy();
    expect(queryByText('00:00')).toBeNull();
    expect(queryByText('You')).toBeNull();
  });

  it('opens the stored Core meeting link through the safe URL policy', async () => {
    mockUseApiQuery.mockReturnValueOnce({
      ...baseQueryState,
      data: {
        id: 'apt-1',
        appointment_date: '2099-06-02T09:00:00.000Z',
        doctor_name: 'Dr Video',
        specialty: 'Virtual care',
        clinic: 'Video visit',
        diagnosis: null,
        visit_type: 'video',
        status: 'scheduled',
        notes: null,
        video_join_url: 'https://meet.example/room-123',
        has_prescription: false,
        prescription: null,
      },
    } as never);

    const { getByText, queryByText } = render(<JoinVideoVisitScreen />);

    expect(queryByText('Video link unavailable')).toBeNull();
    await act(async () => {
      fireEvent.press(getByText('Open video visit link'));
    });

    expect(mockSafeOpenUrl).toHaveBeenCalledWith('https://meet.example/room-123');
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('shows an open failure when the safe URL policy rejects the meeting link', async () => {
    mockSafeOpenUrl.mockResolvedValueOnce(false);
    mockUseApiQuery.mockReturnValueOnce({
      ...baseQueryState,
      data: {
        id: 'apt-1',
        appointment_date: '2099-06-02T09:00:00.000Z',
        doctor_name: 'Dr Video',
        specialty: 'Virtual care',
        clinic: 'Video visit',
        diagnosis: null,
        visit_type: 'video',
        status: 'scheduled',
        notes: null,
        video_join_url: 'http://meet.example/room-123',
        has_prescription: false,
        prescription: null,
      },
    } as never);

    const { getByText } = render(<JoinVideoVisitScreen />);

    await act(async () => {
      fireEvent.press(getByText('Open video visit link'));
    });

    expect(mockSafeOpenUrl).toHaveBeenCalledWith('http://meet.example/room-123');
    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(getByText('Could not open video visit link')).toBeTruthy();
    expect(getByText('Use an HTTPS meeting link that this device can open.')).toBeTruthy();
  });

  it('keeps actions on valid native routes', () => {
    const { getByText } = render(<JoinVideoVisitScreen />);

    fireEvent.press(getByText('Open appointment'));
    fireEvent.press(getByText('Open chat'));

    expect(mockRouterPush).toHaveBeenCalledWith('/care/appointment/apt-1');
    expect(mockRouterPush).toHaveBeenCalledWith('/chat');
  });
});
