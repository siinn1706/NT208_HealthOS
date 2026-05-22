/**
 * POST /api/v1/mfa/verify → POST /v1/mfa/verify
 * Verifies a TOTP code or recovery code during MFA-protected login.
 * Defense-in-depth rate limit on top of Core's mfa.py:183 limiter (V-1).
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/bff-rate-limit";

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, RATE_LIMITS["auth:mfa_verify"]);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  return coreProxy(req, "/v1/mfa/verify", { method: "POST", body });
}
