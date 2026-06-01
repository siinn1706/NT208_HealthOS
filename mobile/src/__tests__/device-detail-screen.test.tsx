/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DeviceDetailScreen } from '../components/profile/device-detail-screen';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { deviceService } from '../api/services/device-service';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services/device-service', () => ({
  deviceService: {
    list: jest.fn(),
    sync: jest.fn(),
    disconnect: jest.fn(),
    ingest: jest.fn(),
    getSyncState: jest.fn(),
    putSyncState: jest.fn(),
    patchPermissions: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

jest.mock('../components/primitives/button', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    Button: ({
      label,
      onPress,
      disabled,
      accessibilityLabel,
    }: {
      label: string;
      onPress?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
    }) => ReactActual.createElement(
      Text,
      {
        accessibilityRole: 'button',
        accessibilityLabel: accessibilityLabel ?? label,
        accessibilityState: { disabled: Boolean(disabled) },
        onPress,
      },
      label,
    ),
  };
});

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockDeviceService = deviceService as jest.Mocked<typeof deviceService>;
const mockInvalidateApiQuery = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockRouterBack = router.back as jest.MockedFunction<typeof router.back>;

const healthDevice = {
  id: 'dev-hc-1',
  provider: 'health_connect',
  name: 'Health Connect',
  model: null,
  connected: true,
  last_sync: null,
  battery_pct: null,
  device_label: 'Health Connect',
  external_account_id: null,
  scopes: ['Steps'],
  last_sync_status: 'permission_denied',
  last_sync_error: null,
  last_sync_count: null,
  last_attempted_at: null,
};

const legacyDevice = {
  ...healthDevice,
  id: 'dev-fitbit-1',
  provider: 'fitbit',
  name: 'Fitbit',
  device_label: 'Fitbit',
};

const syncRows = [
  {
    record_type: 'Steps',
    changes_token: 'tok-1',
    last_synced_at: null,
    last_attempted_at: null,
    consecutive_failures: 0,
  },
  {
    record_type: 'HeartRate',
    changes_token: 'tok-2',
    last_synced_at: null,
    last_attempted_at: null,
    consecutive_failures: 1,
  },
];

const devicesReload = jest.fn();
const syncStateReload = jest.fn();

function renderDetail(device = healthDevice) {
  mockUseLocalSearchParams.mockReturnValue({ id: device.id });
  mockUseApiQuery.mockImplementation((key) => {
    if (key === 'devices.list') {
      return {
        data: [device],
        error: null,
        isLoading: false,
        isRefreshing: false,
        isEmpty: false,
        reload: devicesReload,
      } as never;
    }
    if (key === `devices.sync-state.${device.id}`) {
      return {
        data: syncRows,
        error: null,
        isLoading: false,
        isRefreshing: false,
        isEmpty: false,
        reload: syncStateReload,
      } as never;
    }
    return {
      data: null,
      error: null,
      isLoading: false,
      isRefreshing: false,
      isEmpty: false,
      reload: jest.fn(),
    } as never;
  });
  return render(<DeviceDetailScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  devicesReload.mockResolvedValue(undefined);
  syncStateReload.mockResolvedValue(undefined);
  mockUseLocalSearchParams.mockReturnValue({ id: 'dev-hc-1' });
  mockDeviceService.list.mockResolvedValue([healthDevice]);
  mockDeviceService.getSyncState.mockResolvedValue(syncRows);
  mockDeviceService.putSyncState.mockResolvedValue(syncRows as never);
  mockDeviceService.disconnect.mockResolvedValue(undefined);
});

describe('DeviceDetailScreen Health Connect behavior', () => {
  it('falls back cleanly when native Health Connect is not linked', async () => {
    const { getByText, getAllByText, queryByText, queryByLabelText } = renderDetail();

    expect(getByText('devices.healthConnectNativeSyncTitle')).toBeTruthy();
    expect(queryByText('Save permissions')).toBeNull();
    expect(queryByLabelText('common.more')).toBeNull();

    fireEvent.press(getByText('devices.syncNow'));

    await waitFor(() => {
      expect(getByText('devices.actionFailed')).toBeTruthy();
      expect(getAllByText(/Core device identity is saved/).length).toBeGreaterThan(0);
    });
    expect(mockDeviceService.connect).not.toHaveBeenCalled();
    expect(mockDeviceService.ingest).not.toHaveBeenCalled();
    expect(mockDeviceService.patchPermissions).not.toHaveBeenCalled();
    expect(mockDeviceService.sync).not.toHaveBeenCalled();
  });

  it('reloads sync-state after resetting Health Connect tokens', async () => {
    const { getByText } = renderDetail();

    fireEvent.press(getByText('devices.resetSyncTokens'));

    await waitFor(() => {
      expect(mockDeviceService.putSyncState).toHaveBeenCalledWith('dev-hc-1', {
        Steps: null,
        HeartRate: null,
      });
      expect(syncStateReload).toHaveBeenCalled();
    });
  });

  it('renders legacy provider rows without enabling stub sync success even if the handler is reached', () => {
    const { getByLabelText, getByText } = renderDetail(legacyDevice);

    expect(getByText('devices.providerSyncUnsupportedTitle')).toBeTruthy();
    expect(getByLabelText('devices.syncUnavailable').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getByLabelText('devices.syncUnavailable'));

    expect(mockDeviceService.sync).not.toHaveBeenCalled();
    expect(mockDeviceService.putSyncState).not.toHaveBeenCalled();
    expect(getByText('devices.actionFailed')).toBeTruthy();
  });

  it('keeps legacy provider sync-token reset side-effect free even if the handler is reached', () => {
    const { getByLabelText } = renderDetail(legacyDevice);

    expect(getByLabelText('devices.resetSyncTokens').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getByLabelText('devices.resetSyncTokens'));

    expect(mockDeviceService.putSyncState).not.toHaveBeenCalled();
    expect(syncStateReload).not.toHaveBeenCalled();
  });

  it('disconnects through Core and invalidates the devices list', async () => {
    const { getByText } = renderDetail();

    fireEvent.press(getByText('devices.disconnect'));

    await waitFor(() => {
      expect(mockDeviceService.disconnect).toHaveBeenCalledWith('dev-hc-1');
      expect(mockInvalidateApiQuery).toHaveBeenCalledWith('devices.list');
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });
});
