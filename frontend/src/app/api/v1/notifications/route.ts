/**
 * BFF Notifications — list user notifications.
 * GET /api/v1/notifications
 */
import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const unreadOnly = req.nextUrl.searchParams.get("unread_only") === "true";

  // TODO: auth check
  const res = await fetch(
    `${CORE_API_URL}/v1/notifications?unread_only=${unreadOnly}`,
    { next: { revalidate: 0 } }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
