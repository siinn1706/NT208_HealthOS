import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

/**
 * Mobile bearer-token refresh endpoint.
 * Accepts { refresh_token } in the request body and proxies to Core /v1/auth/refresh.
 * Unlike /api/v1/auth/refresh (cookie-only), this route is stateless — no httpOnly cookie
 * is set. Mobile stores the returned tokens in SecureStore.
 */
export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/auth/refresh", { method: "POST", requireAuth: false });
}
