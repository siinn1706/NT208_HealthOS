/**
 * BFF: Emergency Health Card — owner-side public-access audit trail.
 *
 * GET /api/v1/users/me/emergency-profile/access-logs?limit=&token_id=
 *
 * Returns the most recent N hits on this user's QR cards. Truncated IPs
 * (/24 v4 or /64 v6) — never the full client IP.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/users/me/emergency-profile/access-logs");
}
