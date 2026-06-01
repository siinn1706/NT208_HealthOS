/* eslint-env jest */
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  appLockUnavailableMessage,
  authenticateAppLock,
  getAppLockAvailability,
  isAppLockEnabled,
  setAppLockEnabled,
  subscribeAppLockEnabled,
} from '../auth/app-lock-service';

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
  authenticateAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

beforeEach(() => {
  jest.clearAllMocks();
  mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
  mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
  mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  ]);
  mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG);
  mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
});

describe('app-lock-service', () => {
  it('persists app lock and notifies subscribers', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAppLockEnabled(listener);

    mockSecureStore.getItemAsync.mockResolvedValueOnce('1');
    await expect(isAppLockEnabled()).resolves.toBe(true);

    await setAppLockEnabled(true);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('healthos.mobile.app_lock_enabled', '1');
    expect(listener).toHaveBeenCalledWith(true);

    await setAppLockEnabled(false);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('healthos.mobile.app_lock_enabled');
    expect(listener).toHaveBeenCalledWith(false);
    unsubscribe();
  });

  it('reports available biometric local auth', async () => {
    await expect(getAppLockAvailability()).resolves.toMatchObject({
      available: true,
      methods: ['Fingerprint'],
      securityLevel: 'Strong biometric',
    });
  });

  it('reports unavailable hardware without throwing', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValueOnce(false);
    await expect(getAppLockAvailability()).resolves.toMatchObject({
      available: false,
      reason: 'no_hardware',
    });
    expect(appLockUnavailableMessage('no_hardware')).toMatch(/does not expose/i);
  });

  it('authenticates with local auth options before enabling lock', async () => {
    await expect(authenticateAppLock('Enable lock')).resolves.toBe(true);
    expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith(expect.objectContaining({
      promptMessage: 'Enable lock',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'weak',
    }));
  });

  it('returns false when local auth is cancelled', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await expect(authenticateAppLock()).resolves.toBe(false);
  });

  it('returns false when native auth throws', async () => {
    mockLocalAuth.authenticateAsync.mockRejectedValueOnce(new Error('native unavailable'));
    await expect(authenticateAppLock()).resolves.toBe(false);
  });
});
