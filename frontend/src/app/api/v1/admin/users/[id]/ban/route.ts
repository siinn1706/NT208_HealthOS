/**
 * BFF route: POST /api/v1/admin/users/[id]/ban
 *
 * Guards the request with an admin session check, validates the request body
 * against `banBodySchema`, and proxies to Core's /v1/admin/users/{id}/ban
 * with the trimmed reason. Returns 400 on validation failure without
 * forwarding to Core.
 *
 * Requirements: 3.4, 3.9, 3.10, 3.12
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";
import {
  banBodySchema,
  validationErrorResponse,
} from "@/lib/admin/admin-validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── 1. Admin session guard ───────────────────────────────────────────────
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  // ── 2. Parse and validate request body ──────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: [{ message: "Request body must be valid JSON" }] } },
      { status: 400 },
    );
  }

  const result = banBodySchema.safeParse(rawBody);
  if (!result.success) {
    return NextResponse.json(validationErrorResponse(result.error), { status: 400 });
  }

  // ── 3. Forward to Core with trimmed reason ───────────────────────────────
  const { id } = await params;
  return coreProxy(request, `/v1/admin/users/${id}/ban`, {
    method: "POST",
    body: { reason: result.data.reason },
  });
}
