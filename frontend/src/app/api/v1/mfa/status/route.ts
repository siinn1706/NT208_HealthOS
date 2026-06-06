/**
 * MFA status BFF alias — proxy to Core BE.
 * GET /api/v1/mfa/status → GET /v1/mfa/status
 *
 * The parent handler at /api/v1/mfa also answers GET /api/v1/mfa; this alias
 * exists because mobile uses the literal subpath /api/v1/mfa/status.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/mfa/status", { method: "GET" });
}
