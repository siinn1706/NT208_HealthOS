/**
 * BFF — POST /api/v1/wearables/google/connect
 *
 * Thin proxy to Core BE. The Core endpoint returns
 * `{ authorization_url }` and the SPA does `window.location.href = url`.
 * Keeping the browser away from the Core BE directly is the project-wide
 * rule (see AGENTS.md §0) — the BFF carries the session cookie and
 * forwards a Bearer token to Core.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

export async function POST(req: NextRequest) {
  return coreProxy(req, "/v1/wearables/google/connect", { method: "POST" });
}
