/**
 * BFF Users/me — proxy to Core BE /v1/users/me.
 * GET /api/v1/users/me — fetch current user profile
 * PATCH /api/v1/users/me — update current user profile
 *
 * Rule: Always validate session before forwarding to Core BE.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/users/me");
}

export async function PATCH(req: NextRequest) {
  return coreProxy(req, "/v1/users/me", { method: "PATCH" });
}
