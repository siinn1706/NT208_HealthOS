/**
 * async-control.ts
 *
 * Debounce and retry utilities for admin UI async operations.
 * Requirements: 6.4, 7.1, 10.5
 */

/**
 * Returns a debounced version of `fn` that:
 * - Drops calls while a previous call's promise is still in-flight
 * - After the in-flight call resolves/rejects, waits `ms` milliseconds of
 *   idle time before allowing the next call through
 */
export function debounce<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ms: number,
): T {
  let inFlight = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let idleResolve = false; // true once the idle window has elapsed

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    // Drop the call if a previous promise is still pending
    if (inFlight) {
      return Promise.resolve(undefined) as ReturnType<T>;
    }

    // Drop the call if we are still in the idle window after the last call
    if (!idleResolve && idleTimer !== null) {
      return Promise.resolve(undefined) as ReturnType<T>;
    }

    // Clear any pending idle timer — we are about to start a new call
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    idleResolve = false;
    inFlight = true;

    const promise = fn.apply(this, args) as ReturnType<T>;

    Promise.resolve(promise).finally(() => {
      inFlight = false;
      // Start the idle window; only after it elapses will the next call go through
      idleTimer = setTimeout(() => {
        idleResolve = true;
        idleTimer = null;
      }, ms);
    });

    return promise;
  } as unknown as T;
}

/**
 * Creates a retry gate that tracks consecutive attempt counts.
 *
 * - `canRetry()` returns true if fewer than `maxAttempts` consecutive
 *   `recordAttempt` calls have been made
 * - `recordAttempt()` increments the attempt counter
 * - `reset()` resets the counter to 0
 */
export function retryGate(maxAttempts: number): {
  canRetry: () => boolean;
  recordAttempt: () => void;
  reset: () => void;
} {
  let attempts = 0;

  return {
    canRetry(): boolean {
      return attempts < maxAttempts;
    },
    recordAttempt(): void {
      attempts += 1;
    },
    reset(): void {
      attempts = 0;
    },
  };
}
