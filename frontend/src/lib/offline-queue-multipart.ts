/**
 * IndexedDB-backed offline queue for **multipart** mutations (B7 P7).
 *
 * The existing `offline-queue.ts` (localStorage / JSON-only) cannot persist
 * `File`/`Blob` payloads — taking a meal photo offline would lose the bytes
 * on reload. This module parallels that API but stores entries in IndexedDB
 * so a queued photo upload survives a refresh, a tab restart, or a process
 * crash. Each entry still carries an `Idempotency-Key` so the server-side
 * replay store can collapse retries.
 *
 * Why no `idb` dependency? The surface area we need (single object store,
 * `add` / `getAll` / `delete` / `put`) is small enough that the raw API
 * keeps the bundle slim and dependency-free.
 *
 * Failure model mirrors `offline-queue.ts`:
 *   - 2xx → drop entry, fire `onSuccess`.
 *   - 4xx → drop entry, fire `onDrop("client-error")`.
 *   - network / 5xx → bump `attempts`, keep entry. After `MAX_ATTEMPTS` the
 *     entry is dropped and `onDrop("max-attempts")` is fired so the FE can
 *     surface a "View failed uploads" banner.
 */
const DB_NAME_BASE = "healthos-multipart";
const LEGACY_DB_NAME = "healthos.offline-queue.v1";
const STORE = "multipart-entries";
const SCHEMA_VERSION = 1;
const MAX_ATTEMPTS = 5;

/**
 * Per-user IndexedDB name. Scoping the database (rather than the records
 * inside) means user-A's queued meal photos cannot be replayed under user-B's
 * session after a logout/login on a shared device. The `purgeAllUserScoped`
 * helper enumerates every `healthos-multipart-*` database via
 * `indexedDB.databases()` on logout.
 */
function dbNameFor(userId: string | null): string {
  return `${DB_NAME_BASE}-${userId ?? "anon"}`;
}

let _scopePromise: Promise<string> | null = null;
async function resolveDbName(): Promise<string> {
  if (_scopePromise) return _scopePromise;
  // Lazy import keeps this module React-free.
  _scopePromise = import("@/lib/user-scoped-storage").then(
    async ({ resolveAuthUserId }) => dbNameFor(await resolveAuthUserId()),
  );
  return _scopePromise;
}

export type MultipartFieldValue = Blob | File | string;

export interface MultipartField {
  name: string;
  value: MultipartFieldValue;
  /** Only used when `value` is a Blob/File without a `.name`. */
  filename?: string;
}

export interface MultipartQueueEntry {
  id: string;
  idempotencyKey: string;
  url: string;
  method: "POST" | "PUT" | "PATCH";
  fields: MultipartField[];
  label?: string;
  enqueuedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
}

type Listener = (entries: MultipartQueueEntry[]) => void;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

async function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    throw new Error("IndexedDB unavailable");
  }
  const dbName = await resolveDbName();
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(dbName, SCHEMA_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

/**
 * Drop the cached scope so the next `openDb` resolves fresh — used by tests
 * and by `purgeAllUserScoped` once it has finished deleting the per-user DB.
 */
export function __resetMultipartScope(): void {
  _scopePromise = null;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let completed = false;
    Promise.resolve()
      .then(() => fn(store))
      .then((value) => {
        completed = true;
        tx.oncomplete = () => resolve(value);
      })
      .catch(reject);
    tx.onerror = () => {
      if (!completed) reject(tx.error ?? new Error("IndexedDB transaction failed"));
    };
    tx.onabort = () => {
      if (!completed) reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function notifyListeners() {
  if (listeners.size === 0) return;
  try {
    const entries = await getMultipartQueue();
    for (const fn of listeners) fn(entries);
  } catch {
    /* swallow — listener is informational only */
  }
}

export async function getMultipartQueue(): Promise<MultipartQueueEntry[]> {
  if (!isBrowser()) return [];
  try {
    return await withStore("readonly", (store) =>
      new Promise<MultipartQueueEntry[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as MultipartQueueEntry[]) ?? []);
        req.onerror = () => resolve([]);
      }),
    );
  } catch {
    return [];
  }
}

export function subscribeMultipart(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export interface EnqueueMultipartInput {
  url: string;
  method: "POST" | "PUT" | "PATCH";
  fields: MultipartField[];
  label?: string;
  /** Override the generated key; useful when the caller wants idempotency
   * derived from a domain id (e.g. a meal client_id). */
  idempotencyKey?: string;
}

export async function enqueueMultipart(input: EnqueueMultipartInput): Promise<MultipartQueueEntry> {
  const key = input.idempotencyKey ?? uuid();
  const entry: MultipartQueueEntry = {
    id: key,
    idempotencyKey: key,
    url: input.url,
    method: input.method,
    fields: input.fields,
    label: input.label,
    enqueuedAt: Date.now(),
    attempts: 0,
  };
  await withStore("readwrite", (store) =>
    new Promise<void>((resolve, reject) => {
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("IndexedDB put failed"));
    }),
  );
  void notifyListeners();
  return entry;
}

export async function removeMultipart(id: string): Promise<void> {
  await withStore("readwrite", (store) =>
    new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("IndexedDB delete failed"));
    }),
  );
  void notifyListeners();
}

/**
 * Drop every queued multipart entry — used by the logout path so PHI does not
 * persist on a shared device. Caller is responsible for emitting the audit
 * event ("queued meal photos scrubbed on logout").
 */
export async function clearMultipartQueue(): Promise<void> {
  await withStore("readwrite", (store) =>
    new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("IndexedDB clear failed"));
    }),
  );
  void notifyListeners();
}

export interface FlushMultipartOptions {
  fetcher?: typeof fetch;
  onSuccess?: (entry: MultipartQueueEntry, response: Response) => void;
  onDrop?: (entry: MultipartQueueEntry, reason: "client-error" | "max-attempts") => void;
  onTransientFailure?: (entry: MultipartQueueEntry, error: unknown) => void;
}

let flushing = false;

export async function flushMultipart(opts: FlushMultipartOptions = {}): Promise<number> {
  if (!isBrowser() || flushing) return 0;
  flushing = true;
  let drained = 0;
  try {
    const fetcher = opts.fetcher ?? fetch;
    const queue = await getMultipartQueue();
    for (const entry of queue) {
      try {
        const fd = new FormData();
        for (const field of entry.fields) {
          if (typeof field.value === "string") {
            fd.append(field.name, field.value);
          } else {
            fd.append(field.name, field.value, field.filename ?? "upload.bin");
          }
        }
        const headers: Record<string, string> = {
          "Idempotency-Key": entry.idempotencyKey,
        };
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Multipart queue drains one entry at a time to preserve idempotent ordering.
        const res = await fetcher(entry.url, {
          method: entry.method,
          headers,
          body: fd,
          credentials: "include",
        });
        if (res.ok) {
          // oxlint-disable-next-line react-doctor/async-await-in-loop -- Queue mutation follows the current upload result.
          await removeMultipart(entry.id);
          drained += 1;
          opts.onSuccess?.(entry, res);
          continue;
        }
        if (res.status >= 400 && res.status < 500) {
          // oxlint-disable-next-line react-doctor/async-await-in-loop -- Queue mutation follows the current upload result.
          await removeMultipart(entry.id);
          opts.onDrop?.(entry, "client-error");
          continue;
        }
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Retry accounting depends on the current upload result.
        await bumpAttempts(entry, `HTTP ${res.status}`, opts);
      } catch (err) {
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Retry accounting depends on the current upload error.
        await bumpAttempts(entry, err instanceof Error ? err.message : "network", opts);
        opts.onTransientFailure?.(entry, err);
      }
    }
  } finally {
    flushing = false;
  }
  return drained;
}

async function bumpAttempts(
  entry: MultipartQueueEntry,
  error: string,
  opts: FlushMultipartOptions,
): Promise<void> {
  const next: MultipartQueueEntry = {
    ...entry,
    attempts: entry.attempts + 1,
    lastAttemptAt: Date.now(),
    lastError: error,
  };
  if (next.attempts >= MAX_ATTEMPTS) {
    await removeMultipart(entry.id);
    opts.onDrop?.(entry, "max-attempts");
    return;
  }
  await withStore("readwrite", (store) =>
    new Promise<void>((resolve, reject) => {
      const req = store.put(next);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("IndexedDB put failed"));
    }),
  );
  void notifyListeners();
}

export const __MULTIPART_QUEUE_TESTING__ = {
  DB_NAME_BASE,
  LEGACY_DB_NAME,
  STORE,
  SCHEMA_VERSION,
  MAX_ATTEMPTS,
};
