/**
 * BFF route: GET /api/v1/admin/overview
 *
 * Guards the request with an admin session check, then proxies to
 * Core's /v1/admin/overview. The coreProxy handles the 5-second
 * upstream timeout and maps transport errors to 502.
 *
 * Requirements: 3.1, 3.9, 3.10, 3.12
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(request: NextRequest) {
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  return coreProxy(request, "/v1/admin/overview");
}
