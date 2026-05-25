// TODO: Core endpoint /v1/admin/users/{id}/subscription/history not yet implemented (Validation D4 — table `subscription_assignments` deferred to follow-up plan).

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  const { id } = await params;
  const res = await coreProxy(request, `/v1/admin/users/${id}/subscription/history`);

  if (res.status === 404) {
    console.warn(`[admin/subscription/history] Core endpoint for user ${id} not found — returning empty stub.`);
    return NextResponse.json({ data: [] });
  }

  return res;
}
