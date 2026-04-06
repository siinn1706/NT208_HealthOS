/**
 * MFA BFF routes — proxy to Core BE MFA endpoints.
 *
 * GET  /api/v1/mfa           → GET  /v1/mfa/status
 * POST /api/v1/mfa           → POST /v1/mfa/setup     (initiate setup, returns secret + QR + recovery codes)
 *
 * The sub-path routes (verify-setup, verify, disable) live in their own files
 * under mfa/verify-setup/, mfa/verify/, mfa/disable/.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/mfa/status", { method: "GET" });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return coreProxy(req, "/v1/mfa/setup", { method: "POST", body });
}
