/**
 * Offline mutation queue for idempotent BFF endpoints (meals, vitals, …).
 *
 * Design constraints
 * ------------------
 * - Persists to `localStorage` so refreshes / tab restarts don't drop pending writes.
 * - Each entry carries a stable `idempotencyKey` (UUID v4) that callers MUST forward
 *   to the backend via the `Idempotency-Key` header. Replays from the queue use the
 *   same key, so backend collapsing guarantees at-most-once side effects.
 * - This module never imports React. It's a tiny pure store; the matching React
 *   hook lives in `src/hooks/useOfflineQueue.ts`.
 * - The actual fetcher is supplied by the caller. We intentionally do NOT couple
 *   the queue to a specific HTTP client so it can layer over `bffFetchClient`,
 *   `fetch`, or a future custom transport.
 * - Only `POST` / `PUT` / `PATCH` / `DELETE` mutations should be enqueued.
 *   `GET` reads should be retried by the caller — they're not idempotent in a
 *   business sense (they reflect server-side state).
 *
 * Failure model
 * -------------
 * An entry stays in the queue until it is either:
 *   - successfully flushed (HTTP 2xx); removed.
 *   - rejected with HTTP 4xx (4xx === "the server says this is invalid even
 *     after retry"), in which case it is removed and the caller's `onDrop`
 *     hook is invoked so the UI can surface the error.
 *   - failing with network/5xx, in which case its `attempts` counter is bumped
 *     and it remains queued for the next flush cycle. After `MAX_ATTEMPTS` it
 *     is dropped to avoid permanent retry storms — and `onDrop(_, "max-attempts")`
 *     is invoked so the UI can surface the permanent failure.
 *
 * Privacy
 * -------
 * The localStorage key is namespaced by the authenticated user id via
 * `setScope(userId)` (called once on mount in `useOfflineQueue`). Until a scope
 * is set, the queue presents as empty so we never write under the wrong user.
 */

import { userKeySync } from "@/lib/user-scoped-storage";

const STORAGE_BUCKET = "offline-queue";
const SCHEMA_VERSION = 1;
const MAX_ATTEMPTS = 8;

export type QueueMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface QueueEntry {
  /** Stable ID; the same as `idempotencyKey` for simplicity. */
  id: string;
  /** UUID v4 sent as `Idempotency-Key` header. */
  idempotencyKey: string;
  /** Absolute path or BFF-relative path (e.g. `/api/v1/meals`). */
  url: string;
  method: QueueMethod;
  /** JSON-serialisable body. Must NOT contain `File`/`Blob` — see notes below. */
  body?: unknown;
  /** Optional headers to send. `Idempotency-Key` is added automatically. */
  headers?: Record<string, string>;
  /** Free-form label used by the UI ("Log meal", "Save vital", …). */
  label?: string;
  /** Wall-clock time the user attempted the action. */
  enqueuedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
}

interface PersistedQueue {
  schemaVersion: number;
  entries: QueueEntry[];
}

type Listener = (entries: QueueEntry[]) => void;

const listeners = new Set<Listener>();

// ─────────────────────────────────────────────────────────────────────────────
// Per-user scoping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `null` until the React hook resolves the BFF session and calls `setScope`.
 * Reads/writes are no-ops while unset so we never persist under the wrong
 * user (cross-user PHI leak guard).
 */
let _scope: string | null = null;

/**
 * Bind the queue to the given user id. Pass `null` to detach (e.g. on
 * logout — `purgeAllUserScoped` will also wipe the storage entry).
 *
 * Safe to call repeatedly; if the scope changes the in-memory listeners
 * are notified with the new scope's queue contents.
 */
export function setScope(userId: string | null): void {
  if (_scope === userId) return;
  _scope = userId;
  // Notify subscribers — the queue contents are now from a different scope.
  for (const fn of listeners) fn(getQueue());
}

function storageKey(): string | null {
  if (_scope === null) return null;
  return userKeySync(_scope, STORAGE_BUCKET);
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRaw(): PersistedQueue {
  if (!isBrowser()) return { schemaVersion: SCHEMA_VERSION, entries: [] };
  const key = storageKey();
  if (!key) return { schemaVersion: SCHEMA_VERSION, entries: [] };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { schemaVersion: SCHEMA_VERSION, entries: [] };
    const parsed = JSON.parse(raw) as PersistedQueue | null;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
      return { schemaVersion: SCHEMA_VERSION, entries: [] };
    }
    return parsed;
  } catch {
    return { schemaVersion: SCHEMA_VERSION, entries: [] };
  }
}

function writeRaw(q: PersistedQueue) {
  if (!isBrowser()) return;
  const key = storageKey();
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(q));
  } catch {
    /* quota exceeded; nothing to do — caller will surface failure */
  }
  for (const fn of listeners) fn(q.entries);
}

/** Cryptographically random UUID v4 with `crypto.randomUUID` fallback. */
function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback. Sufficient for an idempotency key.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getQueue(): QueueEntry[] {
  return readRaw().entries.slice();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface EnqueueInput {
  url: string;
  method: QueueMethod;
  body?: unknown;
  headers?: Record<string, string>;
  label?: string;
  /** Override the generated idempotency key. Use only when the caller can
   *  guarantee uniqueness (e.g. derived from a client-generated entity id). */
  idempotencyKey?: string;
}

export function enqueue(input: EnqueueInput): QueueEntry {
  const key = input.idempotencyKey ?? uuid();
  const entry: QueueEntry = {
    id: key,
    idempotencyKey: key,
    url: input.url,
    method: input.method,
    body: input.body,
    headers: input.headers,
    label: input.label,
    enqueuedAt: Date.now(),
    attempts: 0,
  };
  const cur = readRaw();
  cur.entries.push(entry);
  writeRaw(cur);
  return entry;
}

export function remove(id: string): void {
  const cur = readRaw();
  const next = cur.entries.filter((e) => e.id !== id);
  if (next.length !== cur.entries.length) {
    writeRaw({ ...cur, entries: next });
  }
}

export function clear(): void {
  writeRaw({ schemaVersion: SCHEMA_VERSION, entries: [] });
}

export interface FlushOptions {
  /**
   * Custom fetcher. Defaults to `window.fetch`. The implementation MUST forward
   * the supplied `Idempotency-Key` header — we do not retry safety here.
   */
  fetcher?: typeof fetch;
  /** Called when an entry is dropped due to non-retryable status (4xx) or
   *  having exhausted MAX_ATTEMPTS retries. */
  onDrop?: (entry: QueueEntry, reason: "client-error" | "max-attempts") => void;
  /** Called when an entry is successfully flushed. */
  onSuccess?: (entry: QueueEntry, response: Response) => void;
  /** Called when an entry is kept queued after a transient failure. */
  onTransientFailure?: (entry: QueueEntry, error: unknown) => void;
}

/**
 * Attempt to drain every entry in queue order. Returns the count of
 * successfully flushed entries. The queue is mutated in place.
 *
 * This function is safe to call concurrently — it serialises internally.
 */
let flushing = false;
export async function flush(opts: FlushOptions = {}): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let drained = 0;
  try {
    const fetcher = opts.fetcher ?? fetch;
    const queue = getQueue();
    for (const entry of queue) {
      try {
        const headers: Record<string, string> = {
          "content-type": "application/json",
          "idempotency-key": entry.idempotencyKey,
          ...(entry.headers ?? {}),
        };
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Offline queue drains one entry at a time to preserve idempotent ordering.
        const res = await fetcher(entry.url, {
          method: entry.method,
          headers,
          body: entry.body !== undefined ? JSON.stringify(entry.body) : undefined,
          credentials: "include",
        });
        if (res.ok) {
          remove(entry.id);
          drained += 1;
          opts.onSuccess?.(entry, res);
          continue;
        }
        if (res.status >= 400 && res.status < 500) {
          remove(entry.id);
          opts.onDrop?.(entry, "client-error");
          continue;
        }
        const dropped = bumpAttempts(entry, `HTTP ${res.status}`);
        if (dropped) {
          // Caller is told this entry has run out of retries — surface the
          // failure to the UI so the user can re-attempt manually.
          opts.onDrop?.(entry, "max-attempts");
        } else {
          opts.onTransientFailure?.(entry, new Error(`HTTP ${res.status}`));
        }
      } catch (err) {
        const dropped = bumpAttempts(entry, err instanceof Error ? err.message : "network");
        if (dropped) {
          opts.onDrop?.(entry, "max-attempts");
        } else {
          opts.onTransientFailure?.(entry, err);
        }
      }
    }
  } finally {
    flushing = false;
  }
  return drained;
}

/**
 * Increment `attempts`, persist, and report whether the entry was dropped
 * after exceeding MAX_ATTEMPTS. Returns `true` when the entry was removed
 * from the queue, so the caller can fire `onDrop(_, "max-attempts")`.
 */
function bumpAttempts(entry: QueueEntry, error: string): boolean {
  const cur = readRaw();
  const idx = cur.entries.findIndex((e) => e.id === entry.id);
  if (idx === -1) return false;
  const next = cur.entries.slice();
  const updated: QueueEntry = {
    ...next[idx]!,
    attempts: next[idx]!.attempts + 1,
    lastAttemptAt: Date.now(),
    lastError: error,
  };
  if (updated.attempts >= MAX_ATTEMPTS) {
    next.splice(idx, 1);
    writeRaw({ ...cur, entries: next });
    return true;
  }
  next[idx] = updated;
  writeRaw({ ...cur, entries: next });
  return false;
}

export const __TESTING__ = {
  STORAGE_BUCKET,
  SCHEMA_VERSION,
  MAX_ATTEMPTS,
  resetScope: () => {
    _scope = null;
  },
};
