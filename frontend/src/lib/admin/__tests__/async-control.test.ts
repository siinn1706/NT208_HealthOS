/**
 * async-control.test.ts
 *
 * Unit tests for debounce and retryGate utilities.
 * Tasks 6.2, 6.6, 6.7
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { debounce, retryGate } from "../async-control";

// ---------------------------------------------------------------------------
// retryGate
// ---------------------------------------------------------------------------

describe("retryGate", () => {
  it("allows retries when no attempts have been recorded", () => {
    const gate = retryGate(3);
    expect(gate.canRetry()).toBe(true);
  });

  it("allows retries while under the maxAttempts threshold", () => {
    const gate = retryGate(3);
    gate.recordAttempt();
    expect(gate.canRetry()).toBe(true);
    gate.recordAttempt();
    expect(gate.canRetry()).toBe(true);
  });

  it("returns false after maxAttempts consecutive recordAttempt calls", () => {
    const gate = retryGate(3);
    gate.recordAttempt();
    gate.recordAttempt();
    gate.recordAttempt();
    expect(gate.canRetry()).toBe(false);
  });

  it("reset() restores canRetry to true", () => {
    const gate = retryGate(3);
    gate.recordAttempt();
    gate.recordAttempt();
    gate.recordAttempt();
    expect(gate.canRetry()).toBe(false);
    gate.reset();
    expect(gate.canRetry()).toBe(true);
  });

  it("works with maxAttempts = 1", () => {
    const gate = retryGate(1);
    expect(gate.canRetry()).toBe(true);
    gate.recordAttempt();
    expect(gate.canRetry()).toBe(false);
  });

  it("works with maxAttempts = 0 (never allows retry)", () => {
    const gate = retryGate(0);
    expect(gate.canRetry()).toBe(false);
  });

  it("reset after partial attempts allows full quota again", () => {
    const gate = retryGate(3);
    gate.recordAttempt();
    gate.reset();
    gate.recordAttempt();
    gate.recordAttempt();
    expect(gate.canRetry()).toBe(true);
    gate.recordAttempt();
    expect(gate.canRetry()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// debounce — uses fake timers
// ---------------------------------------------------------------------------

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the underlying function on the first invocation", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const debouncedFn = debounce(fn, 300);

    const p = debouncedFn();
    await p;

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("drops calls while the first promise is in-flight", async () => {
    let resolveFirst!: (v: string) => void;
    const first = new Promise<string>((res) => { resolveFirst = res; });
    const fn = vi.fn()
      .mockReturnValueOnce(first)
      .mockResolvedValue("second");

    const debouncedFn = debounce(fn, 300);

    // First call — in-flight
    debouncedFn();
    // Second call while first is still pending — should be dropped
    debouncedFn();
    debouncedFn();

    // Resolve the first promise
    resolveFirst("first");
    await first;

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("drops calls during the idle window after in-flight resolves", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const debouncedFn = debounce(fn, 300);

    // First call completes
    await debouncedFn();

    // Advance time partially — still inside idle window
    vi.advanceTimersByTime(100);

    // Call during idle window — should be dropped
    debouncedFn();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows a new call after the idle window elapses", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const debouncedFn = debounce(fn, 300);

    // First call
    await debouncedFn();

    // Advance past the idle window
    vi.advanceTimersByTime(300);

    // Second call — should go through
    await debouncedFn();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("returns a resolved promise (not undefined) for dropped calls", async () => {
    let resolveFirst!: (v: string) => void;
    const first = new Promise<string>((res) => { resolveFirst = res; });
    const fn = vi.fn().mockReturnValueOnce(first);

    const debouncedFn = debounce(fn, 300);

    debouncedFn(); // in-flight
    const dropped = debouncedFn(); // dropped

    // Should be a thenable (Promise), not throw
    await expect(dropped).resolves.toBeUndefined();

    resolveFirst("done");
    await first;
  });

  it("forwards arguments to the underlying function", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const debouncedFn = debounce(fn as (...args: unknown[]) => Promise<unknown>, 300);

    vi.advanceTimersByTime(300); // ensure idle window is clear
    await debouncedFn("arg1", 42);

    expect(fn).toHaveBeenCalledWith("arg1", 42);
  });
});

// ---------------------------------------------------------------------------
// Property 30: Recoverable failure UX is uniform
// Validates: Requirements 10.4, 10.5
// ---------------------------------------------------------------------------

describe("retryGate — Property 30: Recoverable failure UX is uniform", () => {
  it("canRetry() is false after exactly maxAttempts recordAttempt calls, true after N-1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (maxAttempts) => {
          const gate = retryGate(maxAttempts);

          // After N-1 calls, canRetry() must still be true
          for (let i = 0; i < maxAttempts - 1; i++) {
            gate.recordAttempt();
          }
          if (!gate.canRetry()) return false;

          // After the Nth call, canRetry() must be false
          gate.recordAttempt();
          return gate.canRetry() === false;
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21: Debounced fetch / refresh
// Validates: Requirements 6.4, 7.1
// ---------------------------------------------------------------------------

/**
 * Property 21: Debounced fetch / refresh
 *
 * For any sequence of N trigger events (N ∈ [2, 10]) fired while the first
 * call is still in-flight, the debounced function SHALL issue exactly one
 * upstream call (all subsequent triggers are dropped).
 *
 * Additionally, for any quiescent window of length ≥ d ms, at most one
 * upstream call is issued per window.
 *
 * **Validates: Requirements 6.4, 7.1**
 */
describe("Property 21: Debounced fetch / refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires exactly once when N calls are made while first is in-flight (N in [2, 10])", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 100, max: 1000 }),
        (n, delayMs) => {
          // Arrange: a fn whose first call never resolves during the test
          let resolveFirst!: () => void;
          const firstPromise = new Promise<void>((res) => {
            resolveFirst = res;
          });
          const fn = vi.fn().mockReturnValueOnce(firstPromise);

          const debouncedFn = debounce(fn as () => Promise<void>, delayMs);

          // Act: fire N calls — first goes in-flight, rest are dropped
          for (let i = 0; i < n; i++) {
            debouncedFn();
          }

          // Assert: only one upstream call was made
          const result = fn.mock.calls.length === 1;

          // Cleanup: resolve the in-flight promise so timers can settle
          resolveFirst();

          return result;
        },
      ),
      { numRuns: 50 },
    );
  });

  it("issues at most one call per quiescent window of length >= d ms", async () => {
    // Use a fixed set of representative (windows, d) pairs rather than
    // generating them, because we need async/await to flush microtasks
    // between windows (fake timers don't flush Promise microtasks).
    const cases: Array<[number, number]> = [
      [1, 300],
      [2, 300],
      [3, 500],
      [5, 100],
      [1, 500],
    ];

    for (const [windows, d] of cases) {
      const fn = vi.fn().mockResolvedValue("ok");
      const debouncedFn = debounce(fn as () => Promise<unknown>, d);

      for (let w = 0; w < windows; w++) {
        // Fire the call and await it so the .finally() microtask runs
        await debouncedFn();
        // Now advance past the idle window so the next call is allowed
        vi.advanceTimersByTime(d + 1);
      }

      expect(fn).toHaveBeenCalledTimes(windows);
    }
  });

  it("drops all triggers that arrive during an in-flight call", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),   // extra calls beyond the first
        fc.integer({ min: 100, max: 500 }), // debounce delay d
        (extraCalls, d) => {
          let resolveFirst!: () => void;
          const firstPromise = new Promise<void>((res) => {
            resolveFirst = res;
          });
          const fn = vi.fn().mockReturnValueOnce(firstPromise);

          const debouncedFn = debounce(fn as () => Promise<void>, d);

          // First call — goes in-flight
          debouncedFn();

          // Fire extra calls while first is still pending
          for (let i = 0; i < extraCalls; i++) {
            debouncedFn();
          }

          const callsDuringFlight = fn.mock.calls.length;

          // Cleanup
          resolveFirst();

          // Only the first call should have reached fn
          return callsDuringFlight === 1;
        },
      ),
      { numRuns: 50 },
    );
  });
});
