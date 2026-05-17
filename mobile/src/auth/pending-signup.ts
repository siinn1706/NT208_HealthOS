let pending: { email: string; password: string; name: string; username: string } | null = null;

export function setPendingSignup(data: typeof pending) { pending = data; }
export function getPendingSignup() { return pending; }
export function clearPendingSignup() { pending = null; }
