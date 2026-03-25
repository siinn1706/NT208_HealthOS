/**
 * Redis caching utilities for server-side analytics.
 * NOTE: Redis operations run server-side only (never in Client Components).
 */

let redis: ReturnType<typeof import("redis").createClient> | null = null;

async function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    const { createClient } = await import("redis");
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
  }
  return redis;
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = await getRedisClient();
  return client ? await client.get(key) : null;
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  const client = await getRedisClient();
  if (client) await client.set(key, value, { EX: ttlSeconds });
}

export function cacheKey(userId: string, prefix: string, params: Record<string, string | number>): string {
  return `analytics:${userId}:${prefix}:${JSON.stringify(params)}`;
}

export async function cacheDel(key: string): Promise<void> {
  const client = await getRedisClient();
  if (client) await (client as unknown as { del: (k: string) => Promise<number> }).del(key);
}
