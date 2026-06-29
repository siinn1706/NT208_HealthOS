/**
 * BFF: POST /api/v1/reports/share
 * Proxies to Core `/v1/reports/share`, which fans the report out to recipients
 * over email / in-app. `coreProxy` enforces the same-origin (CSRF) guard and
 * forwards the session cookie.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/reports/share", { method: "POST" });
}
