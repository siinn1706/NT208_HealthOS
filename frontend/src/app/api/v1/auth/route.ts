/**
 * BFF Auth — session endpoint.
 * GET /api/v1/auth/session
 *
 * TODO: Replace with NextAuth getServerSession() when auth is wired up.
 */
import { NextResponse } from "next/server";

export async function GET() {
  // TODO: return getServerSession() data
  return NextResponse.json(
    { error: { code: "AUTH_REQUIRED", message: "Auth not configured yet." } },
    { status: 401 }
  );
}
