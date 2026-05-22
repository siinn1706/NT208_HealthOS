/**
 * In-memory rate-limit store for non-production environments.
 *
 * Module-level singleton is used by the main application.
 * createMemoryStore() creates isolated instances for test isolation.
 *
 * ttlMs is derived from expiresAt - Date.now() so vi.setSystemTime works
 * correctly in tests.
 *
 * Sweep: when the map exceeds 10 000 entries, expired entries are evicted
 * to prevent unbounded growth during long dev sessions.
 */

export interface StoreResult {
  count: number;
  ttlMs: number;
}

interface Bucket {
  count: number;
  expiresAt: number;
}

const MAX_BUCKETS = 10_000;

export class MemoryStore {
  private readonly buckets = new Map<string, Bucket>();

  private sweep(): void {
    if (this.buckets.size <= MAX_BUCKETS) return;
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt <= now) this.buckets.delete(key);
      if (this.buckets.size <= MAX_BUCKETS) break;
    }
  }

  incrWithWindow(key: string, windowSeconds: number): StoreResult {
    this.sweep();
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + windowSeconds * 1000;
      this.buckets.set(key, { count: 1, expiresAt });
      return { count: 1, ttlMs: windowSeconds * 1000 };
    }

    existing.count += 1;
    const ttlMs = Math.max(0, existing.expiresAt - now);
    return { count: existing.count, ttlMs };
  }

  clear(): void {
    this.buckets.clear();
  }
}

/** Factory for test-isolated instances. */
export function createMemoryStore(): MemoryStore {
  return new MemoryStore();
}

// Module-level singleton used by the main application (non-production).
const _singleton = new MemoryStore();

export function incrWithWindow(key: string, windowSeconds: number): StoreResult {
  return _singleton.incrWithWindow(key, windowSeconds);
}

export function clear(): void {
  _singleton.clear();
}
