/**
 * BFF Notifications — bulk mark-as-read.
 * POST /api/v1/notifications/read-all → POST /v1/notifications/read-all
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/notifications/read-all", { method: "POST" });
}
