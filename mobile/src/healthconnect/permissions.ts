/**
 * Health Connect permission helpers.
 *
 * The HC SDK models permissions as `(accessType, recordType)` pairs. We
 * only ever ask for read-only permissions in MVP — write-back is Phase 4.
 *
 * Two key behaviours:
 *   - `requestPermissions()` returns the SET of permissions the user
 *     ACTUALLY granted (not the set we asked for). Callers must compare
 *     to know if the result is full / partial / denied.
 *   - `getGrantedPermissions()` is also called on app foreground so we can
 *     detect out-of-band revocation (user toggled it off in system Settings).
 */
import { ensureInitialized } from "./client";
import type { HealthConnectRecordType } from "./types";

export type PermissionAccess = "read" | "write";

export interface HealthConnectPermission {
  accessType: PermissionAccess;
  recordType: HealthConnectRecordType | string;
}

export type PermissionGrantOutcome = "full" | "partial" | "denied";

export interface PermissionGrantResult {
  outcome: PermissionGrantOutcome;
  granted: HealthConnectPermission[];
  /** The recordTypes from the request that the user did NOT grant. */
  missing: HealthConnectRecordType[];
}

/**
 * Ask the user for the supplied record-type permissions (read-only).
 *
 * Returns a structured outcome rather than a bare list so the UI can
 * branch on `denied` (show the "we need at least Steps" empty state)
 * vs `partial` (show a banner) vs `full` (proceed to first sync).
 */
export async function requestPermissions(
  recordTypes: HealthConnectRecordType[]
): Promise<PermissionGrantResult> {
  const mod = await ensureInitialized();
  const requested: HealthConnectPermission[] = recordTypes.map((rt) => ({
    accessType: "read",
    recordType: rt,
  }));
  const granted = await mod.requestPermission(requested);
  return classify(granted, recordTypes);
}

/**
 * Fetch the current granted set without showing UI. Called on app
 * foreground to detect revocations. Cheap on the SDK side (no system
 * dialog), so calling it once per foreground transition is fine.
 */
export async function getGrantedPermissions(
  recordTypes: HealthConnectRecordType[]
): Promise<PermissionGrantResult> {
  const mod = await ensureInitialized();
  const granted = await mod.getGrantedPermissions();
  return classify(granted, recordTypes);
}

/**
 * Optional disconnect path: revoke all permissions our app holds. Triggers
 * the system to show "all data sources removed" notification — used when
 * the user explicitly disconnects HC from inside HealthOS.
 *
 * Note: this revokes permissions in HC, but does NOT delete data we've
 * already imported into HealthOS. That's a separate user-facing action
 * (Settings → Data export → Delete account → ...).
 */
export async function revokeAllPermissions(): Promise<void> {
  const mod = await ensureInitialized();
  await mod.revokeAllPermissions();
}

function classify(
  granted: HealthConnectPermission[],
  requested: HealthConnectRecordType[]
): PermissionGrantResult {
  const grantedReadTypes = new Set(
    granted
      .filter((g) => g.accessType === "read")
      .map((g) => g.recordType as HealthConnectRecordType)
  );
  const missing = requested.filter((rt) => !grantedReadTypes.has(rt));
  const grantedTyped: HealthConnectPermission[] = requested
    .filter((rt) => grantedReadTypes.has(rt))
    .map((rt) => ({ accessType: "read", recordType: rt }));

  let outcome: PermissionGrantOutcome;
  if (grantedTyped.length === 0) outcome = "denied";
  else if (missing.length === 0) outcome = "full";
  else outcome = "partial";

  return { outcome, granted: grantedTyped, missing };
}
