/**
 * GET /api/v1/_health/rate-limit
 *
 * Returns the current rate-limit backend status for deploy gating (RT-4).
 * Open endpoint — backend choice (redis/memory/none) is safe to disclose.
 * No PII, no secrets in response.
 */
import { NextResponse } from "next/server";
import { getStoreKind } from "@/lib/bff-rate-limit";

type BackendStatus = "ok" | "unconfigured" | "unreachable";

export async function GET(): Promise<NextResponse> {
  const kind = await getStoreKind();

  if (kind === "none") {
    return NextResponse.json(
      { status: "unconfigured" as BackendStatus, backend: "none" },
      { status: 200 },
    );
  }

  if (kind === "memory") {
    return NextResponse.json({ status: "ok" as BackendStatus, backend: "memory" });
  }

  // Redis — probe reachability
  try {
    const { ping } = await import("@/lib/bff-rate-limit-store-redis");
    const reachable = await ping();
    if (!reachable) {
      return NextResponse.json(
        { status: "unreachable" as BackendStatus, backend: "redis" },
        { status: 200 },
      );
    }
    return NextResponse.json({ status: "ok" as BackendStatus, backend: "redis" });
  } catch {
    return NextResponse.json(
      { status: "unreachable" as BackendStatus, backend: "redis" },
      { status: 200 },
    );
  }
}
