/**
 * BFF proxy for `/v1/devices/{id}/sync-state` — read-only.
 *
 * The web settings page uses this to render "Last sync 12 min ago,
 * 47 records imported, Steps + HeartRate". The PUT version of the same
 * route is intentionally NOT exposed via BFF — only the mobile app
 * (which has the HC SDK) is allowed to mutate sync tokens.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(req, `/v1/devices/${id}/sync-state`);
}
