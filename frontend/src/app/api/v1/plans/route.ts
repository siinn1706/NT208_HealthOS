/**
 * BFF Plans — subscription plan list.
 * GET /api/v1/plans
 *
 * Currently returns static data. Switch to Core BE fetch when plans API is ready.
 */
import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Replace with Core BE fetch when /v1/plans is implemented.
  const CORE_API_URL = process.env.CORE_API_URL;
  if (CORE_API_URL) {
    try {
      const res = await fetch(`${CORE_API_URL}/v1/plans`, { next: { revalidate: 60 } });
      if (res.ok) return NextResponse.json(await res.json());
    } catch {
      // fall through to static
    }
  }

  // Fallback: static data until Core BE /v1/plans is live
  return NextResponse.json({
    data: [
      { id: "free", name: "Free", price_usd: 0 },
      { id: "pro", name: "Pro", price_usd: 9.99 },
    ],
  });
}
