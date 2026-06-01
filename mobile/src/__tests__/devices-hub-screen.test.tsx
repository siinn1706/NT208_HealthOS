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

  it('renders Android platform affordances when no devices are connected', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      isEmpty: true,
      data: [],
    } as never);

    const { getByText, queryByText } = render(<DevicesHubScreen />);
    expect(getByText('No devices connected')).toBeTruthy();
    expect(getByText('Health Connect')).toBeTruthy();
    expect(queryByText('Samsung Health')).toBeNull();
    expect(queryByText('Apple Health')).toBeNull();
  });

  it('preserves legacy Core apple_health connected rows without promoting it as a platform source', () => {
    mockUseApiQuery.mockReturnValue({
      ...baseQueryState,
      data: [
        {
          id: 'dev-apple-1',
          provider: 'apple_health',
          name: 'Apple Health',
          model: null,
          connected: true,
          last_sync: null,
          battery_pct: null,
          device_label: 'Legacy import',
          external_account_id: null,
          scopes: null,
          last_sync_status: 'ok',
          last_sync_error: null,
          last_sync_count: 1,
          last_attempted_at: null,
        },
      ],
    } as never);

    const { getAllByText, getByText } = render(<DevicesHubScreen />);

    expect(getByText('Health Connect')).toBeTruthy();
    expect(getAllByText('Apple Health')).toHaveLength(1);
    expect(getByText('Legacy import')).toBeTruthy();
  });
});
