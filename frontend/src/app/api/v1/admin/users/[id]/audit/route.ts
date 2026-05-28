// TODO: Core endpoint /v1/admin/users/{id}/audit not implemented (Validation D5 — Core endpoint deferred to follow-up plan).

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
  const res = await coreProxy(request, `/v1/admin/users/${id}/audit`);

  if (res.status === 404) {
    console.warn(`[admin/audit] Core endpoint /v1/admin/users/${id}/audit not found — returning empty stub.`);
    return NextResponse.json({ data: [] });
  }

  return res;
}
