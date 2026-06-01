/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AddDeviceScreen } from '../components/profile/add-device-screen';
import { invalidateApiQuery } from '../api/query';
import { deviceService } from '../api/services/device-service';
import {
  getHealthConnectExternalAccountId,
  saveHealthConnectDeviceId,
} from '../healthconnect/health-connect-external-account-id';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../api/services/device-service', () => ({
  deviceService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock('../healthconnect/health-connect-external-account-id', () => ({
  getHealthConnectExternalAccountId: jest.fn(),
  saveHealthConnectDeviceId: jest.fn(),
}));

const mockGetGrantedPermissions = jest.fn();
const mockSyncHealthConnectNow = jest.fn();

jest.mock('../healthconnect/native-health-connect-adapter', () => ({
  createHealthConnectAdapter: jest.fn(() => ({
    getGrantedPermissions: mockGetGrantedPermissions,
  })),
}));

jest.mock('../healthconnect/use-health-connect-sync', () => ({
  useHealthConnectSync: jest.fn(() => ({
    sync: mockSyncHealthConnectNow,
    reset: jest.fn(),
    isSyncing: false,
    error: null,
    lastResult: null,
  })),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../theme/theme-provider', () => ({
  useThemeContext: () => ({ name: 'calm' }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockDeviceService = deviceService as jest.Mocked<typeof deviceService>;
const mockGetHealthConnectExternalAccountId = getHealthConnectExternalAccountId as jest.MockedFunction<typeof getHealthConnectExternalAccountId>;
const mockSaveHealthConnectDeviceId = saveHealthConnectDeviceId as jest.MockedFunction<typeof saveHealthConnectDeviceId>;
const mockRouterReplace = router.replace as jest.MockedFunction<typeof router.replace>;

jest.setTimeout(15000);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGrantedPermissions.mockResolvedValue(['HeartRate', 'Steps']);
  mockSyncHealthConnectNow.mockResolvedValue({
    deviceId: 'dev-hc-1',
    idempotencyKeys: [],
    batchCount: 0,
    permissionsPatched: false,
    resetSyncTypes: [],
    ingest: { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] },
  });
  mockDeviceService.disconnect.mockResolvedValue(undefined);
});

describe('AddDeviceScreen', () => {
  it('shows Android device sources without the old Apple Health affordance', () => {
    const { getAllByLabelText, getByText, queryByText } = render(<AddDeviceScreen />);

    expect(getAllByLabelText('Connect Health Connect').length).toBeGreaterThan(0);
    expect(getByText('Connect supported Android health sources. Legacy wearable rows stay visible when Core already has them.')).toBeTruthy();
    expect(queryByText('Google Fit')).toBeNull();
    expect(queryByText('Samsung Health')).toBeNull();
    expect(queryByText('Apple Health')).toBeNull();
  });

  it('requires native permissions and first sync before saving Health Connect as connected', async () => {
    mockGetHealthConnectExternalAccountId.mockResolvedValueOnce('health-connect:install-1');
    mockDeviceService.connect.mockResolvedValueOnce({
      id: 'dev-hc-1',
      provider: 'health_connect',
      name: 'Health Connect',
      model: null,
      connected: true,
      last_sync: null,
      battery_pct: null,
      device_label: 'Health Connect',
      external_account_id: null,
      scopes: null,
      last_sync_status: 'permission_denied',
      last_sync_error: null,
      last_sync_count: null,
      last_attempted_at: null,
    });

    const { getAllByLabelText } = render(<AddDeviceScreen />);

    fireEvent.press(getAllByLabelText('Connect Health Connect')[0]);

    await waitFor(() => {
      expect(mockDeviceService.connect).toHaveBeenCalledWith({
        provider: 'health_connect',
        device_label: 'Health Connect',
        external_account_id: 'health-connect:install-1',
        scopes: ['HeartRate', 'Steps'],
      });
    });
    expect(mockGetGrantedPermissions).toHaveBeenCalledTimes(1);
    expect(mockSyncHealthConnectNow).toHaveBeenCalledWith({ deviceId: 'dev-hc-1' });
    expect(invalidateApiQuery).toHaveBeenCalledWith('devices.list');
    expect(mockSaveHealthConnectDeviceId).toHaveBeenCalledWith('dev-hc-1');
    expect(mockRouterReplace).toHaveBeenCalledWith('/profile/devices/dev-hc-1');
  });

  it('does not create a Core device row when native permissions fail', async () => {
    mockGetGrantedPermissions.mockRejectedValueOnce(new Error('Health Connect native unavailable.'));

    const { getAllByLabelText, getByText } = render(<AddDeviceScreen />);

    fireEvent.press(getAllByLabelText('Connect Health Connect')[0]);

    await waitFor(() => {
      expect(getByText('Health Connect native unavailable.')).toBeTruthy();
    });
    expect(mockDeviceService.connect).not.toHaveBeenCalled();
    expect(mockSyncHealthConnectNow).not.toHaveBeenCalled();
    expect(mockSaveHealthConnectDeviceId).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('disconnects the new Core row when first native sync fails', async () => {
    mockGetHealthConnectExternalAccountId.mockResolvedValueOnce('health-connect:install-1');
    mockDeviceService.connect.mockResolvedValueOnce({
      id: 'dev-hc-1',
      provider: 'health_connect',
      name: 'Health Connect',
      model: null,
      connected: true,
      last_sync: null,
      battery_pct: null,
      device_label: 'Health Connect',
      external_account_id: 'health-connect:install-1',
      scopes: ['HeartRate', 'Steps'],
      last_sync_status: 'pending',
      last_sync_error: null,
      last_sync_count: null,
      last_attempted_at: null,
    });
    mockSyncHealthConnectNow.mockRejectedValueOnce(new Error('first sync failed'));

    const { getAllByLabelText, getByText } = render(<AddDeviceScreen />);

    fireEvent.press(getAllByLabelText('Connect Health Connect')[0]);

    await waitFor(() => {
      expect(mockDeviceService.disconnect).toHaveBeenCalledWith('dev-hc-1');
      expect(getByText('first sync failed')).toBeTruthy();
    });
    expect(mockSaveHealthConnectDeviceId).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
