/**
 * BFF Users — proxy to Core BE /v1/users/me.
 * GET /api/v1/users — fetch current user profile
 * PATCH /api/v1/users — update current user profile
 *
 * Rule: Always validate session before forwarding to Core BE.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/users/me");
}

// BFF TODO: PATCH /api/v1/users
//   Trigger: User submits profile form save
//   Request: { fullName?: string; dateOfBirth?: string; gender?: string; phone?: string; address?: string; avatarUrl?: string }
//   Response: User object
//   Fallback: setTimeout mock (profile-data.ts)

export async function PATCH(req: NextRequest) {
  return coreProxy(req, "/v1/users/me", { method: "PATCH" });
}
