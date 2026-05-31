/* eslint-env jest */
import * as SecureStore from 'expo-secure-store';
import { createIdempotencyKey } from '../api/client';
import {
  getHealthConnectExternalAccountId,
  getStoredHealthConnectDeviceId,
  saveHealthConnectDeviceId,
} from '../healthconnect/health-connect-external-account-id';

jest.mock('expo-secure-store');
jest.mock('../api/client', () => ({
  createIdempotencyKey: jest.fn(),
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockCreateIdempotencyKey = createIdempotencyKey as jest.MockedFunction<typeof createIdempotencyKey>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getHealthConnectExternalAccountId', () => {
  it('reuses the stored Health Connect external account id', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('health-connect:stored-id');

    await expect(getHealthConnectExternalAccountId()).resolves.toBe('health-connect:stored-id');

    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('creates and stores a stable Health Connect external account id when absent', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
    mockCreateIdempotencyKey.mockReturnValueOnce('uuid-1');

    await expect(getHealthConnectExternalAccountId()).resolves.toBe('health-connect:uuid-1');

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'healthos.mobile.health_connect_external_account_id',
      'health-connect:uuid-1',
    );
  });

  it('deduplicates concurrent first-run external account id creation', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockCreateIdempotencyKey.mockReturnValueOnce('uuid-2');

    await expect(Promise.all([
      getHealthConnectExternalAccountId(),
      getHealthConnectExternalAccountId(),
    ])).resolves.toEqual(['health-connect:uuid-2', 'health-connect:uuid-2']);

    expect(mockCreateIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('stores and loads the Core Health Connect device id', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('dev-hc-1');

    await expect(getStoredHealthConnectDeviceId()).resolves.toBe('dev-hc-1');
    await saveHealthConnectDeviceId('dev-hc-2');

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'healthos.mobile.health_connect_device_id',
      'dev-hc-2',
    );
  });
});
