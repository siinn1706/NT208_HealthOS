import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

/** Decode JWT to get user_id (used for auth check only — no cache key needed). */
async function getUserIdFromToken(): Promise<string | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
    if (!token) return null;
    const payloadStr = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(payloadStr, "base64").toString());
    return (payload.sub ?? payload.user_id ?? null) as string | null;
  } catch { return null; }
}

/** Proxy to Core BE with cache: "no-store" — always fresh, no Redis needed.
 *
 * Goals are per-user single records (upsert semantics). The 5-min Redis cache
 * adds complexity (requires reliable userId extraction for cache keys) without
 * meaningful benefit. Next.js fetch cache: "no-store" + Core BE response headers
 * give us the freshness we need.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const beRes = await fetch(`${CORE_API_URL}/v1/health-goals`, {
    headers: { Authorization: `Bearer ${token}` },
    // Always fresh — no stale-cache issue after goal save
    cache: "no-store",
  });

  if (!beRes.ok) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR" } }, { status: beRes.status });
  }

  return NextResponse.json(await beRes.json());
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

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
