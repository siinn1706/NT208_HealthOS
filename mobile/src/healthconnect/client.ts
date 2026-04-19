/**
 * Thin wrapper around `react-native-health-connect` that:
 *   1. Lazy-loads the native module so the rest of the app (and Jest tests)
 *      don't crash when the module isn't installed (Expo Go) or the runtime
 *      is iOS / web.
 *   2. Centralizes availability + initialize calls so the caller never has
 *      to remember the order.
 *   3. Surfaces a small `HealthConnectUnavailableError` so the UI can render
 *      a "Install Health Connect from Play Store" CTA instead of a generic
 *      crash.
 *
 * Why dynamic import: the native package throws at import time when the
 * underlying Android module isn't registered (e.g. on iOS/web). Wrapping the
 * require inside a try/catch keeps the bundle compatible with non-Android
 * builds and Jest where the module is mocked.
 */
import { Platform } from "react-native";

export type HealthConnectAvailability =
  | "Installed"
  | "NotInstalled"
  | "NotSupported"
  | "Unknown";

export class HealthConnectUnavailableError extends Error {
  public readonly availability: HealthConnectAvailability;

  constructor(availability: HealthConnectAvailability) {
    super(`Health Connect is not available (status=${availability})`);
    this.name = "HealthConnectUnavailableError";
    this.availability = availability;
  }
}

interface HealthConnectModule {
  initialize: () => Promise<boolean>;
  getSdkStatus: () => Promise<number>;
  requestPermission: (
    permissions: { accessType: "read" | "write"; recordType: string }[]
  ) => Promise<{ accessType: "read" | "write"; recordType: string }[]>;
  getGrantedPermissions: () => Promise<
    { accessType: "read" | "write"; recordType: string }[]
  >;
  revokeAllPermissions: () => Promise<void>;
  readRecords: (
    recordType: string,
    options: {
      timeRangeFilter:
        | { operator: "between"; startTime: string; endTime: string }
        | { operator: "before" | "after"; time: string };
      pageSize?: number;
      pageToken?: string;
      ascendingOrder?: boolean;
    }
  ) => Promise<{ records: unknown[]; pageToken?: string }>;
  getChangesToken: (request: { recordTypes: string[] }) => Promise<string>;
  getChanges: (token: string) => Promise<unknown>;
}

/**
 * SDK status codes (mirroring `androidx.health.connect.client.HealthConnectClient`):
 *   1 = SDK_AVAILABLE  → "Installed"
 *   2 = SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED → "NotInstalled"
 *   3 = SDK_UNAVAILABLE → "NotSupported"
 */
const SDK_STATUS_TO_AVAILABILITY: Record<number, HealthConnectAvailability> = {
  1: "Installed",
  2: "NotInstalled",
  3: "NotSupported",
};

let _module: HealthConnectModule | null = null;
let _initialized = false;
// When a test injects a mock module we skip the `Platform.OS === 'android'`
// guard so the same code path runs in Jest (where Platform.OS === 'web').
// Production callers never set this flag.
let _testOverride = false;

function loadModule(): HealthConnectModule | null {
  if (_module) return _module;
  if (!_testOverride && Platform.OS !== "android") return null;
  try {
    // require (not import) so the bundle can ship without the native module
    // and the absence is a runtime degrade rather than a build failure.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-health-connect");
    _module = mod as HealthConnectModule;
    return _module;
  } catch {
    return null;
  }
}

export async function getAvailability(): Promise<HealthConnectAvailability> {
  if (!_testOverride && Platform.OS !== "android") return "NotSupported";
  const mod = loadModule();
  if (!mod) return "NotInstalled";
  try {
    const status = await mod.getSdkStatus();
    return SDK_STATUS_TO_AVAILABILITY[status] ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Idempotent initialize — safe to call repeatedly, but only triggers the
 * underlying native init the first time. Throws
 * `HealthConnectUnavailableError` so the caller can surface the right CTA.
 */
export async function ensureInitialized(): Promise<HealthConnectModule> {
  const mod = loadModule();
  const availability = await getAvailability();
  if (!mod || availability !== "Installed") {
    throw new HealthConnectUnavailableError(availability);
  }
  if (!_initialized) {
    const ok = await mod.initialize();
    if (!ok) throw new HealthConnectUnavailableError("Unknown");
    _initialized = true;
  }
  return mod;
}

/**
 * Test seam: lets a Jest test inject a mock module so tests can run without
 * having `react-native-health-connect` installed at all. Setting a non-null
 * mock also flips the `_testOverride` flag so the Platform.OS guard is
 * bypassed (Jest runs on node, not Android). Pass `null` to reset.
 */
export function __setHealthConnectModuleForTests(
  mod: HealthConnectModule | null
): void {
  _module = mod;
  _initialized = mod !== null;
  _testOverride = mod !== null;
}
