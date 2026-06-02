/**
 * BFF — chat image upload proxy.
 *
 * Browser code submits multipart/form-data here; this route preserves the
 * boundary and forwards the authenticated request to Core.
 */
import { NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/bff-origin-guard";
import { multipartProxy } from "@/lib/bff/multipart-proxy";

export async function POST(req: NextRequest) {
  assertSameOrigin(req);
  return multipartProxy(req, "/v1/conversations/uploads/image", {
    bodySizeLimit: 5 * 1024 * 1024 + 4096,
  });
}
