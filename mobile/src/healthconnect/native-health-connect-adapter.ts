import { Platform } from 'react-native';
import type { Permission, RecordType } from 'react-native-health-connect';
import type { HealthConnectSyncAdapter } from './orchestrator';
import {
  HEALTH_CONNECT_RECORD_TYPES,
  normalizeHealthConnectRecordTypes,
  type HealthConnectRecordType,
} from './types';
import { readNativeHealthConnectChanges } from './health-connect-native-reader';

type HealthConnectNativeModule = typeof import('react-native-health-connect');

interface HealthConnectAdapterOptions {
  platform?: typeof Platform.OS;
  loadModule?: () => HealthConnectNativeModule;
  now?: () => Date;
  backfillDays?: number;
}

declare const require: (id: 'react-native-health-connect') => HealthConnectNativeModule;

const ANDROID_UNAVAILABLE_MESSAGE = (
  'Health Connect native access is unavailable in Expo Go for this build. ' +
  'Core device identity is saved, but real permission reads and data sync need an Android development build with a Health Connect native module.'
);

const NON_ANDROID_UNAVAILABLE_MESSAGE = (
  'Health Connect sync is Android-only. Core device identity is saved, but this platform cannot read Health Connect data.'
);
const DEFAULT_BACKFILL_DAYS = 30;

export class HealthConnectNativeUnavailableError extends Error {
  constructor(message = getHealthConnectNativeUnavailableMessage()) {
    super(message);
    this.name = 'HealthConnectNativeUnavailableError';
  }
}

export function getHealthConnectNativeUnavailableMessage(platform: typeof Platform.OS = Platform.OS) {
  return platform === 'android' ? ANDROID_UNAVAILABLE_MESSAGE : NON_ANDROID_UNAVAILABLE_MESSAGE;
}

export function createUnavailableHealthConnectAdapter(platform: typeof Platform.OS = Platform.OS): HealthConnectSyncAdapter {
  const throwUnavailable = async () => {
    throw new HealthConnectNativeUnavailableError(getHealthConnectNativeUnavailableMessage(platform));
  };
  return {
    getGrantedPermissions: throwUnavailable,
    requestPermissions: throwUnavailable,
    readChanges: throwUnavailable,
  };
}

export function createHealthConnectAdapter(options: HealthConnectAdapterOptions = {}): HealthConnectSyncAdapter {
  const platform = options.platform ?? Platform.OS;
  if (platform !== 'android') return createUnavailableHealthConnectAdapter(platform);
  const loadModule = options.loadModule ?? (() => require('react-native-health-connect'));
  const now = options.now ?? (() => new Date());
  const backfillDays = options.backfillDays ?? DEFAULT_BACKFILL_DAYS;

  const readyModule = async () => ensureReady(loadModule, platform);

  return {
    // Read-only: never opens the permission prompt. The sync loop calls this on
    // every run, so prompting here would re-ask on each sync when scopes are
    // partially granted. Use requestPermissions() for the grant flow instead.
    async getGrantedPermissions() {
      const module = await readyModule();
      return normalizePermissionRecordTypes(await module.getGrantedPermissions());
    },

    // User-initiated: opens the system prompt for any missing read scopes, then
    // returns the resulting granted set. Call this from the connect/grant flow.
    async requestPermissions() {
      const module = await readyModule();
      const existing = normalizePermissionRecordTypes(await module.getGrantedPermissions());
      const missing = HEALTH_CONNECT_RECORD_TYPES.filter((type) => !existing.includes(type));
      if (missing.length === 0) return existing;
      const requested = await module.requestPermission(buildReadPermissions());
      return normalizePermissionRecordTypes([...await module.getGrantedPermissions(), ...requested]);
    },

    async readChanges(input) {
      const module = await readyModule();
      return readNativeHealthConnectChanges(module, input, { now, backfillDays });
    },
  };
}

async function ensureReady(
  loadModule: () => HealthConnectNativeModule,
  platform: typeof Platform.OS,
): Promise<HealthConnectNativeModule> {
  try {
    const module = loadModule();
    const status = await module.getSdkStatus();
    if (status !== module.SdkAvailabilityStatus.SDK_AVAILABLE) {
      throw new HealthConnectNativeUnavailableError(getSdkStatusMessage(status, module, platform));
    }
    const initialized = await module.initialize();
    if (!initialized) {
      throw new Error('Health Connect initialization returned false.');
    }
    return module;
  } catch (err) {
    if (err instanceof HealthConnectNativeUnavailableError) throw err;
    throw new HealthConnectNativeUnavailableError(`${getHealthConnectNativeUnavailableMessage(platform)} ${getErrorMessage(err)}`);
  }
}

function buildReadPermissions(): Permission[] {
  return HEALTH_CONNECT_RECORD_TYPES.map((recordType) => ({
    accessType: 'read',
    recordType: recordType as RecordType,
  }));
}

function normalizePermissionRecordTypes(permissions: unknown[]): HealthConnectRecordType[] {
  const recordTypes = permissions
    .map((permission) => {
      if (!permission || typeof permission !== 'object') return null;
      const item = permission as { accessType?: unknown; recordType?: unknown };
      return item.accessType === 'read' && typeof item.recordType === 'string' ? item.recordType : null;
    })
    .filter((recordType): recordType is string => recordType != null);
  return normalizeHealthConnectRecordTypes(recordTypes);
}

function getSdkStatusMessage(
  status: number,
  module: HealthConnectNativeModule,
  platform: typeof Platform.OS,
): string {
  if (status === module.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
    return `${getHealthConnectNativeUnavailableMessage(platform)} Health Connect needs to be installed or updated on this Android device.`;
  }
  return `${getHealthConnectNativeUnavailableMessage(platform)} Health Connect SDK status: ${status}.`;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
