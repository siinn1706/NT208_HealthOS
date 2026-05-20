/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { DevicesHubScreen } from '../components/profile/devices-hub-screen';
import { useApiQuery } from '../api/query';

jest.mock('../api/query', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DevicesHubScreen', () => {
  it('renders connected devices from real query data', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: [
        {
          id: 'dev-1',
          provider: 'health_connect',
          name: 'Pixel 8 Watch',
          model: null,
          connected: true,
          last_sync: '2026-05-20T10:00:00.000Z',
          battery_pct: null,
          device_label: 'Pixel 8 Watch',
          external_account_id: null,
          scopes: ['Steps'],
          last_sync_status: 'ok',
          last_sync_error: null,
          last_sync_count: 12,
          last_attempted_at: '2026-05-20T10:00:00.000Z',
        },
      ],
    } as never);

    const { getAllByText } = render(<DevicesHubScreen />);
    expect(getAllByText('Pixel 8 Watch').length).toBeGreaterThan(0);
    expect(getAllByText(/connected device/i).length).toBeGreaterThan(0);
  });

  it('renders empty state when no devices are connected', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      isEmpty: true,
      data: [],
    } as never);

    const { getByText } = render(<DevicesHubScreen />);
    expect(getByText('No devices connected')).toBeTruthy();
  });
});
