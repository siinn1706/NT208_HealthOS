import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/devices/${id}`, { method: "DELETE" });
}

