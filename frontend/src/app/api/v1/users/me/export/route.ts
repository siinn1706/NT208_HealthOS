/**
 * BFF — Account data export request (B7 P8).
 *
 * POST /api/v1/users/me/export → POST /v1/users/me/export
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/users/me/export", { method: "POST" });
}
