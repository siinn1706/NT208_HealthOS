/**
 * Phase 4 stretch — background sync via Android WorkManager + headless JS.
 *
 * Status: documented stub. The MVP runs sync on app foreground only,
 * which covers the demo scenario. Real background sync requires a
 * dedicated runtime path that is intentionally not implemented in this
 * file:
 *
 *   1. Manifest:
 *      - Add `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND`
 *        to `mobile/app.config.ts` (and justify it in Play Console review).
 *
 *   2. Native Android task class (Java/Kotlin):
 *      - Create a `HealthSyncWorker` extending `androidx.work.Worker` (or
 *        `CoroutineWorker`) that triggers a headless JS task by name.
 *      - Schedule it with `PeriodicWorkRequest.Builder(HealthSyncWorker,
 *        6, TimeUnit.HOURS)` plus a `Constraints.Builder().setRequiredNetworkType(
 *        NetworkType.CONNECTED)`.
 *
 *   3. Headless JS registration (this file):
 *      - On native module boot, call `AppRegistry.registerHeadlessTask(
 *        "HealthSyncTask", () => async () => { ...syncDevice... })`.
 *      - The task body should:
 *          a. Hydrate the JWT from `expo-secure-store` (no UI thread).
 *          b. Resolve all HC devices for the user via the API client.
 *          c. Run the orchestrator with `bootstrapDays=0` (delta only).
 *      - Failures should NOT throw — log to a small ring buffer for the
 *        next foreground to surface in the audit panel.
 *
 *   4. Permission gating:
 *      - Background reads need both the manifest permission AND the user
 *        granting `READ_HEALTH_DATA_IN_BACKGROUND` at runtime.
 *      - `getGrantedPermissions()` returns whether the background slot
 *        was granted; gate scheduling on that.
 *
 *   5. Battery + Doze:
 *      - WorkManager respects Doze mode automatically (deferred to a
 *        maintenance window). Don't try to override; the user expects the
 *        OS to manage power.
 *
 * Until all five are in place, the foreground-sync hook in
 * `useForegroundSync.ts` is the only code path that actually calls
 * `syncDevice()`. The function below exists as a placeholder so future
 * work has an obvious entry point and so any caller that imports from
 * here gets a clear "not yet implemented" error.
 */
export const HEALTH_SYNC_TASK_NAME = "HealthSyncTask";

export interface BackgroundSyncStatus {
  registered: boolean;
  reason?: string;
}

/**
 * Returns whether the background-sync worker has been scheduled. Today
 * always returns `{ registered: false, reason: 'not implemented' }` —
 * see file header for what's needed.
 */
export function getBackgroundSyncStatus(): BackgroundSyncStatus {
  return { registered: false, reason: "not implemented (Phase 4 stretch)" };
}

/**
 * Placeholder for the headless task body. Wired up via
 * `AppRegistry.registerHeadlessTask` in a future phase.
 */
export async function backgroundSyncTask(): Promise<void> {
  // Intentionally empty — see file header.
  return;
}
