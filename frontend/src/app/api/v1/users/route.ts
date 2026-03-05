/**
 * BFF Users — proxy to Core BE /v1/users/me.
 * GET /api/v1/users/me
 *
 * Rule: Always validate session before forwarding to Core BE.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/users/me");
}
