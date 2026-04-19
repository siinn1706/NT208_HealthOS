/**
 * BFF — OAuth Linked Accounts (B7 P3).
 *
 * GET /api/v1/auth/oauth/links → GET /v1/auth/oauth/links
 *   List linked OAuth providers for the current user.
 *
 * Both methods require an authenticated session (forwarded by `coreProxy`).
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/auth/oauth/links");
}
