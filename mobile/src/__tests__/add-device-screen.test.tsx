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
  },
}));

jest.mock('../healthconnect/health-connect-external-account-id', () => ({
  getHealthConnectExternalAccountId: jest.fn(),
  saveHealthConnectDeviceId: jest.fn(),
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
});

describe('AddDeviceScreen', () => {
  it('sends the stable Health Connect external account id required by Core', async () => {
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
      });
    });
    expect(invalidateApiQuery).toHaveBeenCalledWith('devices.list');
    expect(mockSaveHealthConnectDeviceId).toHaveBeenCalledWith('dev-hc-1');
    expect(mockRouterReplace).toHaveBeenCalledWith('/profile/devices/dev-hc-1');
  });
});
