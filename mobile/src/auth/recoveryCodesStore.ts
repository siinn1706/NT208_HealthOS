/**
 * In-memory, single-use recovery-codes handoff between MFA enroll/regenerate
 * and the display screen. We deliberately avoid passing the codes through
 * `router.push({ params })` because navigation params can be:
 *   - persisted in deep-link URLs (`healthos://...?codes=[...]`)
 *   - logged by Expo Router's debug instrumentation
 *   - retained in the navigation stack snapshot
 *
 * Instead the producer stashes the codes under a random nonce and sends only
 * the nonce through navigation. The consumer reads-and-deletes on mount.
 *
 * Codes auto-expire after `TTL_MS` so a stale entry doesn't accumulate if the
 * user backgrounds the app between regenerate and the recovery-codes screen.
 */

interface Entry {
  codes: string[];
  expiresAt: number;
}

const STORE = new Map<string, Entry>();
const TTL_MS = 5 * 60 * 1000;

function nonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of STORE) {
    if (entry.expiresAt <= now) {
      STORE.delete(key);
    }
  }
}

export function stash(codes: string[]): string {
  purgeExpired();
  const id = nonce();
  STORE.set(id, { codes: [...codes], expiresAt: Date.now() + TTL_MS });
  return id;
}

export function consume(id: string | undefined | null): string[] {
  if (!id) return [];
  purgeExpired();
  const entry = STORE.get(id);
  if (!entry) return [];
  STORE.delete(id);
  return entry.codes;
}
