/**
 * user-scoped-storage — namespace client storage keys by authenticated user id
 * so that user-A's data on a shared device cannot be read or replayed by
 * user-B after a logout/login cycle.
 *
 * Why this exists
 * ---------------
 * Several client surfaces persist personally identifiable / health-relevant
 * state to localStorage / IndexedDB:
 *   - Onboarding draft (height, weight, conditions, goals)
 *   - Per-conversation chat drafts (chat content)
 *   - Outbound message queue (messages awaiting delivery)
 *   - Idempotent mutation queue (pending meal/vital POSTs)
 *   - OTP-resend cooldown bucket (originally keyed by raw email)
 *
 * Before this helper landed they all used GLOBAL keys (`healthos.onboarding.draft.v1`
 * etc.), so on a shared device user-B inherited user-A's pending state. Worse,
 * the offline-queue would replay user-A's mutations under user-B's session
 * cookie (`credentials: "include"`), corrupting attribution.
 *
 * Contract
 * --------
 *   bucket  = stable name for the surface (e.g. `"onboarding-draft"`)
 *   suffix  = optional secondary key (e.g. conversation id for chat drafts)
 *   userId  = preferred from caller (synchronous, pure); helper falls back to
 *             `"anon"` for routes that legitimately have no session yet
 *
 * Generated key shape: `healthos.<bucket>.<userIdOrAnon>.v<VERSION>[.<suffix>]`
 */

const APP_PREFIX = "healthos";
const STORAGE_VERSION = 2;

/** Synchronous: caller already has the userId in scope. */
export function userKeySync(
  userId: string | null,
  bucket: string,
  suffix?: string,
): string {
  const uid = userId ?? "anon";
  const tail = suffix ? `.${suffix}` : "";
  return `${APP_PREFIX}.${bucket}.${uid}.v${STORAGE_VERSION}${tail}`;
}

/**
 * Resolve the current user id from the BFF session endpoint, with an
 * in-memory cache so concurrent callers share a single fetch.
 * SAFE TO CALL during render (the cached promise just resolves).
 *
 * Returns `null` if no session — callers should treat this as `"anon"`
 * scope via `userKeySync(null, ...)`.
 */
let _cachedUserIdPromise: Promise<string | null> | null = null;
let _cachedUserId: string | null = null;
let _cachedAt = 0;

const SESSION_CACHE_MS = 60_000; // re-resolve after 1 min so logout/login is honoured

export async function resolveAuthUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Honour the cache window so a burst of hooks doesn't hammer the BFF.
  if (_cachedUserId !== null && Date.now() - _cachedAt < SESSION_CACHE_MS) {
    return _cachedUserId;
  }
  if (_cachedUserIdPromise !== null) {
    return _cachedUserIdPromise;
  }

  _cachedUserIdPromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/session", { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json().catch(() => null)) as
        | { data?: { user_id?: unknown; id?: unknown } }
        | null;
      const id = json?.data?.user_id ?? json?.data?.id;
      const out = typeof id === "string" ? id : null;
      _cachedUserId = out;
      _cachedAt = Date.now();
      return out;
    } catch {
      return null;
    } finally {
      _cachedUserIdPromise = null;
    }
  })();

  return _cachedUserIdPromise;
}

/** Async helper for callers that want the resolved key in one go. */
export async function userKey(bucket: string, suffix?: string): Promise<string> {
  const uid = await resolveAuthUserId();
  return userKeySync(uid, bucket, suffix);
}

/** Force the next `resolveAuthUserId` call to refetch. Call on logout. */
export function invalidateUserIdCache(): void {
  _cachedUserId = null;
  _cachedAt = 0;
  _cachedUserIdPromise = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout purge — wipe every `healthos.*` key + the chat IndexedDB.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_PREFIXES_TO_PURGE = [
  `${APP_PREFIX}.`,
  `${APP_PREFIX}:`, // legacy colon-separated (chat-draft v1 used this)
  "auth.cooldown.", // pre-helper resend cooldown bucket
];

/**
 * Per-user IndexedDB databases are named `<base>-<userId>` (see useOutboundQueue
 * for the chat queue and offline-queue-multipart for the meal-photo queue).
 * This list is used to enumerate and delete every variant on logout, plus the
 * pre-fix legacy database names themselves for backwards compatibility.
 */
const INDEXED_DB_NAME_PREFIXES = ["healthos-chat-", "healthos-multipart-"];
const LEGACY_INDEXED_DB_NAMES = ["healthos-chat", "healthos.offline-queue.v1"];

/**
 * Remove every app-scoped client storage entry. Call on logout BEFORE the
 * server session is dropped so any in-flight reads still see the cleared
 * state. Safe to call multiple times.
 */
export async function purgeAllUserScoped(): Promise<void> {
  if (typeof window === "undefined") return;

  invalidateUserIdCache();

  const purgeStorage = (storage: Storage) => {
    const toRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && KEY_PREFIXES_TO_PURGE.some((p) => k.startsWith(p))) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) {
      try {
        storage.removeItem(k);
      } catch {
        /* ignore quota / disabled storage */
      }
    }
  };

  try {
    purgeStorage(window.localStorage);
  } catch {
    /* ignore */
  }
  try {
    purgeStorage(window.sessionStorage);
  } catch {
    /* ignore */
  }

  // IndexedDB — best-effort delete with a 1.5s upper bound per DB so we never
  // block the post-logout redirect on a stuck `onblocked` event.
  if ("indexedDB" in window) {
    const namesToDelete = new Set<string>(LEGACY_INDEXED_DB_NAMES);

    // Modern browsers expose `indexedDB.databases()` so we can enumerate the
    // per-user database variants. Older browsers (Safari < 14) silently skip;
    // those users only ever wrote to the legacy DB so we still cover them.
    type IDBNamed = { name?: string };
    const idbWithList = window.indexedDB as IDBFactory & {
      databases?: () => Promise<IDBNamed[]>;
    };
    if (typeof idbWithList.databases === "function") {
      try {
        const dbs = await idbWithList.databases();
        for (const db of dbs) {
          const name = db?.name;
          if (typeof name !== "string") continue;
          if (INDEXED_DB_NAME_PREFIXES.some((p) => name.startsWith(p))) {
            namesToDelete.add(name);
          }
        }
      } catch {
        /* ignore enumeration failures — we still try the legacy names */
      }
    }

    await Promise.all(
      [...namesToDelete].map(
        (name) =>
          new Promise<void>((resolve) => {
            let settled = false;
            const settle = () => {
              if (!settled) {
                settled = true;
                resolve();
              }
            };
            try {
              const req = window.indexedDB.deleteDatabase(name);
              req.onsuccess = settle;
              req.onerror = settle;
              req.onblocked = settle;
              window.setTimeout(settle, 1500);
            } catch {
              settle();
            }
          }),
      ),
    );

    // Reset the multipart queue's cached scope so a future writer resolves
    // a fresh per-user DB name instead of the just-deleted one.
    try {
      const mod = await import("@/lib/offline-queue-multipart");
      mod.__resetMultipartScope?.();
    } catch {
      /* ignore — module may not be loaded */
    }
    try {
      const mod = await import("@/hooks/useOutboundQueue");
      mod.resetOutboundQueueUserScope?.();
    } catch {
      /* ignore — module may not be loaded */
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration of legacy global keys to user-scoped keys.
// Runs once per session post-deploy. No-op when called without a session.
// ─────────────────────────────────────────────────────────────────────────────

interface MigrationOutcome {
  migrated: string[];
  skipped: string[];
}

const MIGRATION_FLAG_KEY = `${APP_PREFIX}.storage-migration.v${STORAGE_VERSION}`;

const FLAT_LEGACY_KEYS: Array<{ from: string; bucket: string }> = [
  { from: "healthos.onboarding.draft.v1", bucket: "onboarding-draft" },
  { from: "healthos.offline-queue.v1", bucket: "offline-queue" },
];

const PREFIX_LEGACY_KEYS: Array<{ prefix: string; bucket: string }> = [
  { prefix: "healthos:chat-draft:v1:", bucket: "chat-draft" },
];

export async function migrateLegacyKeys(): Promise<MigrationOutcome> {
  const outcome: MigrationOutcome = { migrated: [], skipped: [] };
  if (typeof window === "undefined") return outcome;

  // Run at most once per major version per device.
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === "done") {
      return outcome;
    }
  } catch {
    return outcome;
  }

  const userId = await resolveAuthUserId();
  if (!userId) return outcome; // can't migrate without a target scope

  const moveValue = (fromKey: string, toKey: string) => {
    try {
      const value = window.localStorage.getItem(fromKey);
      if (value === null) return;
      // Don't clobber existing user-scoped data.
      if (window.localStorage.getItem(toKey) !== null) {
        outcome.skipped.push(fromKey);
        return;
      }
      window.localStorage.setItem(toKey, value);
      window.localStorage.removeItem(fromKey);
      outcome.migrated.push(fromKey);
    } catch {
      outcome.skipped.push(fromKey);
    }
  };

  for (const { from, bucket } of FLAT_LEGACY_KEYS) {
    moveValue(from, userKeySync(userId, bucket));
  }

  for (const { prefix, bucket } of PREFIX_LEGACY_KEYS) {
    const matches: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) matches.push(k);
      }
    } catch {
      continue;
    }
    for (const oldKey of matches) {
      const suffix = oldKey.slice(prefix.length);
      moveValue(oldKey, userKeySync(userId, bucket, suffix));
    }
  }

  try {
    window.localStorage.setItem(MIGRATION_FLAG_KEY, "done");
  } catch {
    /* ignore — migration can re-run next session */
  }

  return outcome;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test helper — only exercised from unit tests.
// ─────────────────────────────────────────────────────────────────────────────

export const __INTERNAL_TEST_HOOKS__ = {
  APP_PREFIX,
  STORAGE_VERSION,
  KEY_PREFIXES_TO_PURGE,
  INDEXED_DB_NAME_PREFIXES,
  LEGACY_INDEXED_DB_NAMES,
  MIGRATION_FLAG_KEY,
  resetUserIdCache: invalidateUserIdCache,
};
