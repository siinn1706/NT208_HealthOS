// BFF TODO: PATCH /api/v1/reminders/:id
//   Trigger: User toggles done checkbox
//   Request: { done: boolean }
//   Response: Reminder
//   Fallback: Optimistic toggle in local state

// BFF TODO: DELETE /api/v1/reminders/:id
//   Trigger: User clicks delete button
//   Response: 204
//   Fallback: Optimistic remove from local state

import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/reminders/${id}`, { method: "PATCH" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/reminders/${id}`, { method: "DELETE" });
}
