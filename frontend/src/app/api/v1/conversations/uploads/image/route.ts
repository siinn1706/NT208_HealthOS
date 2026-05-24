/**
 * BFF placeholder — /api/v1/conversations/uploads/image
 * Image upload is not wired to Core yet; returns 501 so the route exists for typegen and future work.
 */
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/bff-origin-guard";

export async function POST(req: NextRequest) {
  assertSameOrigin(req);

  return NextResponse.json(
    { error: "Image upload is not implemented yet" },
    { status: 501 }
  );
}
