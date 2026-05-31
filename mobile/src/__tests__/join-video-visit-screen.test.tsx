/* eslint-env jest */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { JoinVideoVisitScreen } from '../components/care/join-video-visit-screen';
import { useApiQuery } from '../api/query';
import { router } from 'expo-router';

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
        has_prescription: false,
        prescription: null,
      },
    } as never);
  });

  it('shows a truthful unavailable state instead of a fake meeting room', () => {
    const { getByText, queryByText } = render(<JoinVideoVisitScreen />);

    expect(getByText('Video visit unavailable')).toBeTruthy();
    expect(getByText(/no video-session, meeting URL, room token, or media service contract exists/i)).toBeTruthy();
    expect(queryByText('00:00')).toBeNull();
    expect(queryByText('You')).toBeNull();
  });

  it('keeps actions on valid native routes', () => {
    const { getByText } = render(<JoinVideoVisitScreen />);

    fireEvent.press(getByText('Open appointment'));
    fireEvent.press(getByText('Open chat'));

    expect(mockRouterPush).toHaveBeenCalledWith('/care/appointment/apt-1');
    expect(mockRouterPush).toHaveBeenCalledWith('/chat');
  });
});
