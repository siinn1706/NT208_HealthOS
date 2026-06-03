import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/health-metrics");
}

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/health-metrics", { method: "POST" });
}
