import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const APP_LOCK_ENABLED_KEY = 'healthos.mobile.app_lock_enabled';

export type AppLockUnavailableReason = 'no_hardware' | 'not_enrolled' | 'not_available';

export interface AppLockAvailability {
  available: boolean;
  reason?: AppLockUnavailableReason;
  methods: string[];
  securityLevel: string;
}

const listeners = new Set<(enabled: boolean) => void>();

function notify(enabled: boolean) {
  listeners.forEach((listener) => listener(enabled));
}

function methodLabel(type: LocalAuthentication.AuthenticationType): string {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'Fingerprint';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'Face recognition';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'Iris';
    default:
      return 'Local authentication';
  }
}

function securityLevelLabel(level: LocalAuthentication.SecurityLevel): string {
  switch (level) {
    case LocalAuthentication.SecurityLevel.SECRET:
      return 'Device passcode';
    case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
      return 'Biometric';
    case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
      return 'Strong biometric';
    default:
      return 'None';
  }
}

export function subscribeAppLockEnabled(listener: (enabled: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function isAppLockEnabled(): Promise<boolean> {
  return SecureStore.getItemAsync(APP_LOCK_ENABLED_KEY).then((value) => value === '1');
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(APP_LOCK_ENABLED_KEY, '1');
  } else {
    await SecureStore.deleteItemAsync(APP_LOCK_ENABLED_KEY);
  }
  notify(enabled);
}

export async function getAppLockAvailability(): Promise<AppLockAvailability> {
  try {
    const [hasHardware, enrolled, supportedTypes, enrolledLevel] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

    const methods = supportedTypes.map(methodLabel);
    if (!hasHardware || supportedTypes.length === 0) {
      return {
        available: false,
        reason: 'no_hardware',
        methods,
        securityLevel: securityLevelLabel(enrolledLevel),
      };
    }
    if (!enrolled) {
      return {
        available: false,
        reason: 'not_enrolled',
        methods,
        securityLevel: securityLevelLabel(enrolledLevel),
      };
    }
    return {
      available: true,
      methods,
      securityLevel: securityLevelLabel(enrolledLevel),
    };
  } catch {
    return {
      available: false,
      reason: 'not_available',
      methods: [],
      securityLevel: 'None',
    };
  }
}

export async function authenticateAppLock(promptMessage = 'Unlock HealthOS'): Promise<boolean> {
  const availability = await getAppLockAvailability();
  if (!availability.available) return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'weak',
    });
    return result.success;
  } catch {
    return false;
  }
}

export function appLockUnavailableMessage(reason?: AppLockUnavailableReason): string {
  switch (reason) {
    case 'no_hardware':
      return 'This device does not expose biometric authentication to the app.';
    case 'not_enrolled':
      return 'Set up fingerprint or face unlock in Android settings before enabling app lock.';
    default:
      return 'Native local authentication is unavailable in this build.';
  }
}
