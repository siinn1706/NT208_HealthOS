/**
 * BFF Users/search — /api/v1/users/search
 * GET ?q=<query> → search users by display name or email (proxied to Core BE)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(request: NextRequest) {
  // Core BE exposes /v1/users/lookup?q=...
  return coreProxy(request, "/v1/users/lookup");
}
