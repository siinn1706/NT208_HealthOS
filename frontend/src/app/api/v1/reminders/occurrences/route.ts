/**
 * BFF — Reminder occurrences (B7 P5).
 *
 * GET /api/v1/reminders/occurrences?from=&to=&tzid=&today=&status=
 *   → GET /v1/reminders/occurrences
 *
 * Drives the server-driven "today" tab on the reminders page.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(req: NextRequest) {
  return coreProxy(req, "/v1/reminders/occurrences");
}
