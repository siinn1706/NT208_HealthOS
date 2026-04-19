/**
 * BFF: Emergency Health Card — mass-revocation.
 *
 * POST /api/v1/users/me/emergency-profile/tokens/revoke-all
 *
 * One-shot kill switch — revokes every active QR token in a single
 * transaction on the BE side. Idempotent.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(
    req,
    "/v1/users/me/emergency-profile/tokens/revoke-all",
    { method: "POST" }
  );
}
