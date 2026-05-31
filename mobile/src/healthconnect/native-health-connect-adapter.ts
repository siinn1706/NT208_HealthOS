import { Platform } from 'react-native';
import type { HealthConnectSyncAdapter } from './orchestrator';

const ANDROID_UNAVAILABLE_MESSAGE = (
  'Health Connect native access is unavailable in Expo Go for this build. ' +
  'Core device identity is saved, but real permission reads and data sync need an Android development build with a Health Connect native module.'
);

const NON_ANDROID_UNAVAILABLE_MESSAGE = (
  'Health Connect sync is Android-only. Core device identity is saved, but this platform cannot read Health Connect data.'
);

export class HealthConnectNativeUnavailableError extends Error {
  constructor(message = getHealthConnectNativeUnavailableMessage()) {
    super(message);
    this.name = 'HealthConnectNativeUnavailableError';
  }
}

export function getHealthConnectNativeUnavailableMessage(platform: typeof Platform.OS = Platform.OS) {
  return platform === 'android' ? ANDROID_UNAVAILABLE_MESSAGE : NON_ANDROID_UNAVAILABLE_MESSAGE;
}

export function createUnavailableHealthConnectAdapter(): HealthConnectSyncAdapter {
  const throwUnavailable = async () => {
    throw new HealthConnectNativeUnavailableError();
  };
  return {
    getGrantedPermissions: throwUnavailable,
    readChanges: throwUnavailable,
  };
}
