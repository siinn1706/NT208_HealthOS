/**
 * Jittered exponential backoff calculator for WebSocket reconnect scheduling.
 *
 * Using full-jitter strategy (AWS blog recommendation) to spread reconnect
 * storms across a ±25% band around the exponential base so that multiple
 * clients that disconnected simultaneously do not pile up on the server at
 * the same instant.
 *
 * Attempt 0 → base ~1 s  → jittered [750 ms, 1 250 ms]
 * Attempt 5 → base ~32 s → capped at 30 s → jittered [22 500 ms, 37 500 ms]
 *             (cap applied before jitter, so max possible = 30 000 * 1.25 = 37 500 ms)
 */

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/**
 * Return the number of milliseconds to wait before the next reconnect attempt.
 *
 * @param attempt  Zero-based reconnect attempt index (0 = first retry).
 */
export function nextReconnectDelay(attempt: number): number {
  // Exponential base, capped to avoid extremely long waits.
  const base = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  // ±25% jitter: multiply by a random factor in [0.75, 1.25].
  const jitter = base * (0.75 + Math.random() * 0.5);
  return Math.round(jitter);
}
