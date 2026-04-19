/**
 * POST /api/v1/reminders/:id/skip
 *
 * Trigger: User chooses to skip the next occurrence of a recurring reminder.
 * Response: 200 + Reminder
 *
 * Forwards to Core BE /v1/reminders/:id/skip (planned in sub-plan F §3.2).
 */

import { NextRequest } from "next/server";

import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return coreProxy(req, `/v1/reminders/${encodeURIComponent(id)}/skip`, {
    method: "POST",
  });
}
