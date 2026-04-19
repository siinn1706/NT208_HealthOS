/**
 * Persistent state lookup for the orchestrator. The ONLY thing we keep on
 * device is the foreground-debounce timestamp — everything else
 * (changesToken, last sync time, granted scopes) lives server-side so a
 * reinstall never loses sync history.
 *
 * Stored in `expo-secure-store` because (a) it's already in the project,
 * (b) it survives app restarts, and (c) keeping the key in the secure
 * store is overkill but harmless.
 */
import * as SecureStore from "expo-secure-store";

const KEY = "healthos.hc.last_foreground_sync_ms";

/**
 * Returns the unix epoch ms of the last successful foreground sync, or
 * 0 if we have never synced (or the cache was cleared / app reinstalled).
 */
export async function getLastForegroundSyncMs(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function markForegroundSyncCompleted(
  whenMs: number = Date.now()
): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, String(whenMs));
  } catch {
    // Non-fatal; the worst case is we re-trigger the sync next foreground.
  }
}

export async function clearForegroundSyncStamp(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* no-op */
  }
}

/** Foreground auto-sync debounce — see plan §4.5. */
export const FOREGROUND_SYNC_DEBOUNCE_MS = 60 * 60 * 1000; // 1 hour

export async function shouldRunForegroundSync(
  now: number = Date.now()
): Promise<boolean> {
  const last = await getLastForegroundSyncMs();
  if (last <= 0) return true;
  return now - last >= FOREGROUND_SYNC_DEBOUNCE_MS;
}
