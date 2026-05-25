/**
 * GET /api/v1/admin/users/[id]
 *
 * BFF route handler — validates the user-id segment, enforces admin session,
 * then forwards to Core's /v1/admin/users/{id}.
 *
 * Requirements: 1.3, 3.3, 3.9, 3.10, 3.12
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // ── 1. Admin session guard ───────────────────────────────────────────────
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  // ── 2. Resolve dynamic segment ───────────────────────────────────────────
  const { id } = await params;

  // ── 3. Validate id length (R1.3) ─────────────────────────────────────────
  if (id.length < 1 || id.length > 64) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  // ── 4. Forward to Core ───────────────────────────────────────────────────
  return coreProxy(request, `/v1/admin/users/${id}`);
}
