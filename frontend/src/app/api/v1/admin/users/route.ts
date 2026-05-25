/**
 * BFF route: GET /api/v1/admin/users
 *
 * Guards the request with an admin session check, validates query parameters
 * against usersListQuerySchema, translates FE param names to Core BE names,
 * and reshapes the response to the FE-expected envelope.
 *
 * FE sends:   search, status, page, page_size
 * Core needs: q,      status, page, per_page
 *
 * Core returns: { data: AdminUserListItem[], meta: { page, per_page, total } }
 * FE expects:   { data: { users: UserRow[], total, page, page_size } }
 *
 * Requirements: 3.2, 3.9, 3.10, 3.12
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/bff-admin-guard";
import { coreProxy } from "@/lib/core-api-proxy";
import {
  usersListQuerySchema,
  validationErrorResponse,
} from "@/lib/admin/admin-validation";

type CoreUser = {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  banned_at: string | null;
  deleted_at: string | null;
  roles: string[];
  current_subscription: { plan_code: string; status: string } | null;
  created_at: string;
  last_seen_at: string | null;
};

type CoreUsersResponse = {
  data: CoreUser[];
  meta: { page: number; per_page: number; total: number };
};

function deriveStatus(user: CoreUser): "active" | "banned" | "deleted" {
  if (user.deleted_at) return "deleted";
  if (user.banned_at) return "banned";
  return "active";
}

export async function GET(request: NextRequest) {
  const deny = await requireAdminSession(request);
  if (deny) return deny;

  // Validate FE query params (R3.2)
  const searchParams = new URL(request.url).searchParams;
  const rawParams = Object.fromEntries(searchParams.entries());
  const parsed = usersListQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(validationErrorResponse(parsed.error), {
      status: 400,
    });
  }

  // Translate to Core BE param names. coreProxy will also append the original
  // request params (search, page_size) which Core ignores — safe per admin.py:59-62.
  const coreParams = new URLSearchParams({
    status: parsed.data.status,
    page: String(parsed.data.page),
    per_page: String(parsed.data.page_size),
  });
  if (parsed.data.search) coreParams.set("q", parsed.data.search);

  const coreResp = await coreProxy(request, `/v1/admin/users?${coreParams}`);
  if (!coreResp.ok) return coreResp;

  // Reshape Core response envelope to FE-expected shape
  let coreData: CoreUsersResponse;
  try {
    coreData = (await coreResp.json()) as CoreUsersResponse;
  } catch {
    return NextResponse.json(
      { error: { code: "PARSE_ERROR", message: "Failed to parse upstream response." } },
      { status: 502 },
    );
  }

  if (!Array.isArray(coreData?.data) || !coreData?.meta) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Unexpected upstream response shape." } },
      { status: 502 },
    );
  }

  const users = coreData.data.map((u) => ({
    user_id: u.id,
    email: u.email,
    display_name: u.display_name,
    status: deriveStatus(u),
    role: u.roles[0] ?? null,
    subscription: u.current_subscription
      ? { plan_code: u.current_subscription.plan_code, status: u.current_subscription.status }
      : null,
    created_at: u.created_at,
    last_seen_at: u.last_seen_at,
  }));

  return NextResponse.json({
    data: {
      users,
      total: coreData.meta.total,
      page: coreData.meta.page,
      page_size: coreData.meta.per_page,
    },
  });
}
