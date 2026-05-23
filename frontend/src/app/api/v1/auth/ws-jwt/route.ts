/**
 * BFF WS-JWT — /api/v1/auth/ws-jwt
 * GET → return the raw access JWT from the session cookie so the client can
 * open the per-conversation WebSocket at /v1/chat/ws/{conversation_id}?token=...
 *
 * The per-conv WS endpoint expects a regular access token, not the short-lived
 * ws_ticket vended by /api/v1/auth/ws-token, so this route skips the upstream
 * exchange entirely.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/bff-auth-cookie";

function decodeJwtExpSeconds(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp !== "number") return null;
    const remaining = payload.exp - Math.floor(Date.now() / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return null;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  if (!accessToken) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No active session." } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    token: accessToken,
    expires_in_seconds: decodeJwtExpSeconds(accessToken),
  });
}
