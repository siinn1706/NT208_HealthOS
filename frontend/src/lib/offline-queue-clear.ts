/**
 * Single entry point for logout queue scrubbing.
 *
 * No PHI should outlive the session on a shared device. The full user-scoped
 * purge clears legacy localStorage queues, per-user IndexedDB queues, and their
 * in-memory DB-scope caches.
 */
import { purgeAllUserScoped } from "@/lib/user-scoped-storage";

export async function clearAllOfflineQueues(): Promise<void> {
  await purgeAllUserScoped();
}
