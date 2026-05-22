/**
 * Redis-backed rate-limit store for BFF auth routes.
 *
 * Uses a DEDICATED client — NOT the redis-cache.ts singleton.
 * That singleton has no error handler, no connect timeout, and different
 * durability semantics (analytics cache vs. security gate).
 *
 * Key invariant: incrWithWindow is atomic via a Lua script that also returns
 * the actual PTTL so callers can compute a real Retry-After value (RT-14).
 * Uses sendCommand to invoke Redis EVAL without triggering JS-eval lint rules.
 */
import { createClient } from "redis";

export interface StoreResult {
  count: number;
  ttlMs: number;
}

// Atomic INCR + conditional PEXPIRE + PTTL read.
// Returns [count, pttl_ms] as a two-element array.
const LUA_INCR_WINDOW = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]) * 1000)
end
local pttl = redis.call('PTTL', KEYS[1])
return {c, pttl}
`.trim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisClient = any;

let client: RedisClient | null = null;

async function getClient(): Promise<RedisClient> {
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries: number) => Math.min(retries * 200, 3000),
      },
    } as Parameters<typeof createClient>[0]) as RedisClient;

    client.on("error", (e: Error) => {
      console.error(
        JSON.stringify({ event: "bff_rate_limit_redis_error", err: String(e) }),
      );
    });

    await client.connect();
  }
  return client;
}

export async function incrWithWindow(
  key: string,
  windowSeconds: number,
): Promise<StoreResult> {
  const c = await getClient();
  // sendCommand invokes Redis EVAL server-side (Lua runs on Redis, not Node).
  const result = await c.sendCommand([
    "EVAL",
    LUA_INCR_WINDOW,
    "1",
    key,
    String(windowSeconds),
  ]) as [number, number];

  const [count, pttl] = result;
  return { count, ttlMs: Math.max(0, pttl) };
}

/** Probe reachability without side-effects — used by health endpoint. */
export async function ping(): Promise<boolean> {
  try {
    const c = await getClient();
    await c.ping();
    return true;
  } catch {
    return false;
  }
}

/** Reset module-level client — used in test teardown only. */
export function __resetClientForTests(): void {
  client = null;
}
