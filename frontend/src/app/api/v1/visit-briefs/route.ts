/**
 * BFF — Pre-Visit Brief list + create.
 *
 * GET    /api/v1/visit-briefs          → GET    /v1/visit-briefs
 * POST   /api/v1/visit-briefs          → POST   /v1/visit-briefs
 *
 * Thin proxy — auth-cookie unwrap + path forward only. No business logic
 * in the BFF (see `frontend/src/lib/core-api-proxy.ts`).
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/visit-briefs");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/visit-briefs", { method: "POST" });
}
