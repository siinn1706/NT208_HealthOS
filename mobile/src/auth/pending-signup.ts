type PendingSignup = { email: string; name?: string; username: string };

let pending: PendingSignup | null = null;

export function setPendingSignup(data: PendingSignup) { pending = data; }

/** Returns the pending signup data and immediately nulls the in-memory store (consume-once). */
export function consumePendingSignup(): PendingSignup | null {
  const data = pending;
  pending = null;
  return data;
}
