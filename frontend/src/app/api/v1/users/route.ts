/**
 * BFF Users — proxy to Core BE /v1/users/me.
 * GET /api/v1/users/me
 *
 * Rule: Always validate session before forwarding to Core BE.
 */
import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function GET(_req: NextRequest) {
  // TODO: Replace with real session check
  // const session = await getServerSession();
  // if (!session) return NextResponse.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 });

  const res = await fetch(`${CORE_API_URL}/v1/users/me`, {
    // headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 0 },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
