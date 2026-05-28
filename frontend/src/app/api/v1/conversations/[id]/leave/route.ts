/**
 * BFF Conversations/[id]/leave
 * POST → leave a group conversation
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${encodeURIComponent(id)}/leave`, { method: "POST" });
}
