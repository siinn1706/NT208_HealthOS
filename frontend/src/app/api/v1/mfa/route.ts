/**
 * MFA BFF routes - proxy to Core BE MFA endpoints
 */
import { NextRequest, NextResponse } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/mfa/status", { method: "GET" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return coreProxy(req, "/v1/mfa/setup", { method: "POST", body });
}
