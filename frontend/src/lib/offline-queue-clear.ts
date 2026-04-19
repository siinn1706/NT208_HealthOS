/**
 * B7 P7 — single entry point for "scrub everything queued" used by the
 * sign-out flow. Combines the JSON `localStorage` queue (chat, simple meals)
 * with the IndexedDB multipart queue (meal photos, future doc uploads).
 *
 * No PHI should outlive the session on a shared device.
 */
import { clear as clearJsonQueue } from "@/lib/offline-queue";
import { clearMultipartQueue } from "@/lib/offline-queue-multipart";

export async function clearAllOfflineQueues(): Promise<void> {
  try {
    clearJsonQueue();
  } catch {
    /* localStorage may be locked; nothing actionable */
  }
  try {
    await clearMultipartQueue();
  } catch {
    /* IndexedDB may be unavailable in private mode */
  }
}
