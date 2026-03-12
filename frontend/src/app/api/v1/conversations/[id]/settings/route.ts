/**
 * BFF Conversations/[id]/settings — /api/v1/conversations/:id/settings
 * PATCH → update conversation settings (mute, pin, theme)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}/settings`, { method: "PATCH" });
}
