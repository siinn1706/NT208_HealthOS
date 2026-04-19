/**
 * BFF Notifications — unread count badge for the popover.
 * GET /api/v1/notifications/unread-count → GET /v1/notifications/unread-count
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/notifications/unread-count");
}
