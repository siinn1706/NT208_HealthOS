/**
 * BFF Conversations/[id]/transfer-owner
 * POST → transfer group ownership to another member (owner only)
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${encodeURIComponent(id)}/transfer-owner`, { method: "POST" });
}
