/**
 * POST /api/v1/mfa/verify → POST /v1/mfa/verify
 * Verifies a TOTP code or recovery code during MFA-protected login.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return coreProxy(req, "/v1/mfa/verify", { method: "POST", body });
}
