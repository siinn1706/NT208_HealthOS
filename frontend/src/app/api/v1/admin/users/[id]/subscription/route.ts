/**
 * BFF route: PATCH /api/v1/admin/users/[id]/subscription
 *
 * Guards the request with an admin session check, validates the request body
 * against `assignSubscriptionBodySchema`, and proxies to Core's
 * /v1/admin/users/{id}/subscription on success.
 *
 * Requirements: 3.8, 3.9, 3.10, 3.12
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";
import {
  assignSubscriptionBodySchema,
  validationErrorResponse,
} from "@/lib/admin/admin-validation";

export async function PATCH(
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
      { error: { code: "VALIDATION_ERROR", details: [{ message: "Invalid JSON body" }] } },
      { status: 400 },
    );
  }

  const parsed = assignSubscriptionBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
  }

  // ── 3. Forward validated body to Core ───────────────────────────────────
  const { id } = await params;
  return coreProxy(request, `/v1/admin/users/${id}/subscription`, {
    method: "PATCH",
    body: parsed.data,
  });
}
