/**
 * MFA BFF routes - proxy to Core BE MFA endpoints
 */
import { NextRequest, NextResponse } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET() {
  return coreProxy("/v1/mfa/status", { method: "GET" });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return coreProxy("/v1/mfa/setup", { method: "POST", body });
}
