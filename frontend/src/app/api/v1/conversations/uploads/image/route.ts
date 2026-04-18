/**
 * BFF placeholder — /api/v1/conversations/uploads/image
 * Image upload is not wired to Core yet; returns 501 so the route exists for typegen and future work.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Image upload is not implemented yet" },
    { status: 501 }
  );
}
