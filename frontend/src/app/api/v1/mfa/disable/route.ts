/**
 * POST /api/v1/mfa/disable → POST /v1/mfa/disable
 * Disables MFA after verifying the current TOTP code.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return coreProxy(req, "/v1/mfa/disable", { method: "POST", body });
}
