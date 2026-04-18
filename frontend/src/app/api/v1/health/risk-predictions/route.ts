import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/health/risk-predictions");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/health/risk-predictions", { method: "POST" });
}
