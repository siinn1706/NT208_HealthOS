/**
 * BFF /api/v1/chat/conversations/[id]/settings
 * PATCH → update per-user conversation settings (is_muted, is_pinned, theme_id)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/chat/conversations/${id}/settings`);
}
