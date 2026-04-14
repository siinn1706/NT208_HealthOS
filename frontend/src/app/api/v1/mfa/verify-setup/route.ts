/**
 * POST /api/v1/mfa/verify-setup → POST /v1/mfa/verify-setup
 * Completes MFA setup by verifying the first TOTP code.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return coreProxy(req, "/v1/mfa/verify-setup", { method: "POST", body });
}
