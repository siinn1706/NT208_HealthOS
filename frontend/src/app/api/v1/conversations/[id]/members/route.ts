/**
 * BFF Conversations/[id]/members
 * POST → add members to a group conversation (owner/admin only)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${encodeURIComponent(id)}/members`, { method: "POST" });
}
