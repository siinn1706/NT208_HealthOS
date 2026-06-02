/**
 * Generates a stable idempotency key for meal creation requests.
 * Key is prefixed with "meal-" and includes a millisecond timestamp so it is
 * human-readable in server logs. The UUID suffix prevents collisions when two
 * requests are issued within the same millisecond.
 *
 * Falls back gracefully when crypto.randomUUID is unavailable (React Native
 * Hermes <0.72 on older Android).
 */
export function newIdempotencyKey(): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `meal-${Date.now()}-${uuid}`;
}
