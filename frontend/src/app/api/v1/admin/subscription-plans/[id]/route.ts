/**
 * BFF routes: GET and PATCH /api/v1/admin/subscription-plans/[id]
 *
 * Both handlers enforce an admin session check before forwarding to Core.
 * PATCH additionally validates the request body against planPatchSchema and
 * returns 400 on validation failure without forwarding to Core.
 *
 * Requirements: 3.7, 3.8, 3.9, 3.10, 3.12
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";
import { planPatchSchema, validationErrorResponse } from "@/lib/admin/admin-validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // ── 1. Admin session guard ───────────────────────────────────────────────
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  // ── 2. Resolve dynamic segment ───────────────────────────────────────────
  const { id } = await params;

  // ── 3. Forward to Core ───────────────────────────────────────────────────
  return coreProxy(request, `/v1/admin/subscription-plans/${id}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // ── 1. Admin session guard ───────────────────────────────────────────────
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  // ── 2. Resolve dynamic segment ───────────────────────────────────────────
  const { id } = await params;

  // ── 3. Parse and validate request body ───────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: [{ message: "Invalid JSON body" }] } },
      { status: 400 },
    );
  }

  const result = planPatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(validationErrorResponse(result.error), { status: 400 });
  }

  // ── 4. Forward to Core ───────────────────────────────────────────────────
  return coreProxy(request, `/v1/admin/subscription-plans/${id}`);
}
