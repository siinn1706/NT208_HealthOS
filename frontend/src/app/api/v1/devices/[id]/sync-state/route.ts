import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;
  return coreProxy(req, `/v1/devices/${encodeURIComponent(id)}/sync-state`);
}

export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;
  return coreProxy(req, `/v1/devices/${encodeURIComponent(id)}/sync-state`, {
    method: "PUT",
  });
}
