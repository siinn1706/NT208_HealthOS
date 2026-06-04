import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return coreProxy(req, `/v1/health-goals/${encodeURIComponent(id)}`);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return coreProxy(req, `/v1/health-goals/${encodeURIComponent(id)}`);
}
