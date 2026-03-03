/**
 * BFF WS-Token — /api/v1/auth/ws-token
 * GET → return the Core BE access token for WebSocket connection.
 *
 * Since the core_access_token cookie is httpOnly and can't be read by JS,
 * this BFF route reads it server-side and hands it to the browser.
 * Only the token value is returned — no other session data.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("core_access_token")?.value ?? null;

  if (!token) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No active session." } },
      { status: 401 }
    );
  }

  return NextResponse.json({ token });
}
