/* eslint-env jest */
/**
 * Unit tests for the jittered exponential backoff helper (src/lib/ws-backoff.ts).
 *
 * Covers:
 *   - Delay is within the valid jitter band [base*0.75, base*1.25] for each attempt
 *   - Delay is bounded — never exceeds MAX_DELAY_MS * 1.25 (cap applied before jitter)
 *   - Delay is never below BASE_DELAY_MS * 0.75 (minimum possible for attempt 0)
 *   - Delay increases (on average) with attempt number — statistical check over N runs
 *   - Return value is always a non-negative integer (Math.round applied)
 */

import { nextReconnectDelay } from '../lib/ws-backoff';

const BASE_MS = 1_000;
const MAX_BASE_MS = 30_000;
const JITTER_LO = 0.75;
const JITTER_HI = 1.25;

// Number of samples to draw per attempt for statistical checks.
const SAMPLES = 200;

function sampleDelays(attempt: number, n: number): number[] {
  return Array.from({ length: n }, () => nextReconnectDelay(attempt));
}

// ── Value type / shape ────────────────────────────────────────────────────────

describe('nextReconnectDelay — return type', () => {
  it('always returns a non-negative integer', () => {
    for (let attempt = 0; attempt <= 10; attempt++) {
      for (let i = 0; i < 20; i++) {
        const delay = nextReconnectDelay(attempt);
        expect(Number.isInteger(delay)).toBe(true);
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ── Jitter band correctness ───────────────────────────────────────────────────

describe('nextReconnectDelay — jitter band [base*0.75, base*1.25]', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 10])(
    'attempt %i: all samples within expected jitter band',
    (attempt) => {
      const base = Math.min(BASE_MS * Math.pow(2, attempt), MAX_BASE_MS);
      const lo = Math.round(base * JITTER_LO);
      const hi = Math.round(base * JITTER_HI);

      const delays = sampleDelays(attempt, SAMPLES);
      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(lo - 1); // -1 for rounding tolerance
        expect(delay).toBeLessThanOrEqual(hi + 1);    // +1 for rounding tolerance
      }
    },
  );
});

// ── Lower bound ───────────────────────────────────────────────────────────────

describe('nextReconnectDelay — lower bound', () => {
  it('attempt 0: delay is always >= 750 ms (BASE * 0.75)', () => {
    const delays = sampleDelays(0, SAMPLES);
    for (const delay of delays) {
      expect(delay).toBeGreaterThanOrEqual(Math.round(BASE_MS * JITTER_LO) - 1);
    }
  });
});

// ── Upper bound ───────────────────────────────────────────────────────────────

describe('nextReconnectDelay — upper bound', () => {
  it('never exceeds MAX_DELAY_MS * 1.25 for any attempt', () => {
    // Test well-past the cap point (attempt 10 → base would be 1024 s without cap)
    const absoluteMax = Math.round(MAX_BASE_MS * JITTER_HI) + 1; // +1 rounding tolerance
    for (let attempt = 0; attempt <= 15; attempt++) {
      const delays = sampleDelays(attempt, 50);
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(absoluteMax);
      }
    }
  });

  it('caps base at 30 000 ms before jitter (attempt 6 and 10 produce same band)', () => {
    // At attempt 6 base = min(64 000, 30 000) = 30 000, same as attempt 10.
    const band6 = { lo: Math.round(MAX_BASE_MS * JITTER_LO), hi: Math.round(MAX_BASE_MS * JITTER_HI) };
    const delays6 = sampleDelays(6, SAMPLES);
    const delays10 = sampleDelays(10, SAMPLES);

    for (const delay of [...delays6, ...delays10]) {
      expect(delay).toBeGreaterThanOrEqual(band6.lo - 1);
      expect(delay).toBeLessThanOrEqual(band6.hi + 1);
    }
  });
});

// ── Monotonic growth (statistical) ───────────────────────────────────────────

describe('nextReconnectDelay — average delay increases with attempt', () => {
  it('mean(attempt N+1) > mean(attempt N) for attempts 0–4', () => {
    const means = [0, 1, 2, 3, 4].map((attempt) => {
      const delays = sampleDelays(attempt, SAMPLES);
      return delays.reduce((a, b) => a + b, 0) / SAMPLES;
    });

    for (let i = 0; i < means.length - 1; i++) {
      expect(means[i + 1]).toBeGreaterThan(means[i]);
    }
  });
});
