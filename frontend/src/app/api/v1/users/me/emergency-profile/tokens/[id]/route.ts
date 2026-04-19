/**
 * BFF: Emergency Health Card — single-token revocation.
 *
 * DELETE /api/v1/users/me/emergency-profile/tokens/{id}
 *
 * Idempotent — re-revoking is a no-op on the BE side, so a duplicate
 * client-side click does not 4xx.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return coreProxy(
    req,
    `/v1/users/me/emergency-profile/tokens/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}
