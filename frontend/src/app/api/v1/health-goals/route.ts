import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

/** coreProxy enforces auth, CSRF (assertSameOrigin), and forwards token to Core. */
export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/health-goals");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/health-goals");
}
