/**
 * POST /api/v1/reminders/:id/snooze
 *
 * Trigger: User picks a snooze preset on a reminder card.
 * Request: { until: string (ISO 8601) }
 * Response: 200 + Reminder
 *
 * Forwards to Core BE /v1/reminders/:id/snooze (planned in sub-plan F §3.2).
 */

import { NextRequest } from "next/server";

import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return coreProxy(req, `/v1/reminders/${encodeURIComponent(id)}/snooze`, {
    method: "POST",
  });
}
