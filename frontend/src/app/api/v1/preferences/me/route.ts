/**
 * BFF Preferences/me — proxy to Core BE /v1/preferences/me.
 * GET /api/v1/preferences/me — fetch current user preferences
 * PATCH /api/v1/preferences/me — update current user preferences
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/preferences/me");
}

export async function PATCH(req: NextRequest) {
  return coreProxy(req, "/v1/preferences/me", { method: "PATCH" });
}
