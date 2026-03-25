import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";
import { cacheGet, cacheSet, cacheKey, cacheDel } from "@/lib/redis-cache";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

/** Decode JWT to get user_id for per-user cache keys. */
async function getUserIdFromToken(): Promise<string | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
    if (!token) return null;
    // JWT payload is base64url encoded middle segment
    const payloadStr = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(payloadStr, "base64").toString());
    return (payload.sub ?? payload.user_id ?? null) as string | null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

  // Check Redis cache (5-min TTL) — keyed by userId
  const ck = cacheKey(userId, "health-goals", {});
  const cached = await cacheGet(ck);
  if (cached) return NextResponse.json(JSON.parse(cached));

  // Manual fetch (coreProxy doesn't expose token for cache — we need it here)
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const beRes = await fetch(`${CORE_API_URL}/v1/health-goals`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!beRes.ok) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR" } }, { status: beRes.status });
  }

  const beJson = await beRes.json();
  await cacheSet(ck, JSON.stringify(beJson), 300);
  return NextResponse.json(beJson);
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

  // Invalidate caches — MUST use cacheDel
  const ck = cacheKey(userId, "health-goals", {});
  const gamCk = cacheKey(userId, "gamification-summary", {});
  await Promise.all([cacheDel(ck), cacheDel(gamCk)]);

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const body = await req.text();
  const beRes = await fetch(`${CORE_API_URL}/v1/health-goals`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  const beJson = await beRes.json().catch(() => null);
  return NextResponse.json(beJson ?? { error: {} }, { status: beRes.status });
}
