/**
 * BFF Conversations/[id]/accept — /api/v1/conversations/:id/accept
 * POST → accept a pending conversation request
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/conversations/${id}/accept`, { method: "POST" });
}
