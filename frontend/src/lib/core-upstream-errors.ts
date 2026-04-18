/**
 * Classify failures when the BFF cannot reach Core BE (e.g. service down, bad host).
 */

function visitErrorTree(err: unknown, codes: Set<string>, seen: WeakSet<object>): void {
  if (!err || typeof err !== "object") return;
  if (seen.has(err as object)) return;
  seen.add(err as object);

  const o = err as NodeJS.ErrnoException & { cause?: unknown; errors?: unknown[] };
  if (typeof o.code === "string") codes.add(o.code);
  if (o.cause !== undefined) visitErrorTree(o.cause, codes, seen);
  if (Array.isArray(o.errors)) {
    for (const sub of o.errors) visitErrorTree(sub, codes, seen);
  }
}

/** True when fetch to Core likely failed before an HTTP response (connection/DNS). */
export function isCoreUpstreamUnreachable(err: unknown): boolean {
  const codes = new Set<string>();
  visitErrorTree(err, codes, new WeakSet());
  return codes.has("ECONNREFUSED") || codes.has("ENOTFOUND") || codes.has("EAI_AGAIN");
}
