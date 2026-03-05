/**
 * BFF Notifications — list user notifications.
 * GET /api/v1/notifications
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/notifications");
}
