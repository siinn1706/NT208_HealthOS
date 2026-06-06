/**
 * MFA setup BFF alias — proxy to Core BE.
 * POST /api/v1/mfa/setup → POST /v1/mfa/setup
 *
 * The parent handler at /api/v1/mfa also answers POST /api/v1/mfa; this alias
 * exists because mobile uses the literal subpath /api/v1/mfa/setup.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return coreProxy(req, "/v1/mfa/setup", { method: "POST", body });
}
