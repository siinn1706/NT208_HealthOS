/**
 * BFF route: POST /api/v1/admin/users/[id]/unban
 *
 * Guards the request with an admin session check, then proxies to
 * Core's /v1/admin/users/{id}/unban. No body validation is required —
 * this is a simple pass-through with guard. The coreProxy handles the
 * 5-second upstream timeout and maps transport errors to 502.
 *
 * Requirements: 3.5, 3.9, 3.10, 3.12
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  const { id } = await params;
  return coreProxy(request, `/v1/admin/users/${id}/unban`);
}
