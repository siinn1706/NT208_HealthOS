/**
 * BFF — GET /api/v1/wearables/google/callback?code=&state=
 *
 * Google redirects the user's browser here (a full-page navigation) after
 * consent. We proxy the code+state to Core, which validates the signed
 * state, exchanges the code, and persists the ConnectedDevice. Because this
 * is a top-level navigation — not a fetch — we must NOT return Core's JSON
 * (the browser would render raw JSON). Instead we redirect back to the
 * devices settings page with a one-shot `?wearable=connected|error` flag the
 * client reads to flash an outcome banner.
 *
 * The session cookie set before /connect is still in the browser, so
 * coreProxy forwards the JWT and Core can prove the state belongs to this
 * user. GET is a safe method, so the BFF CSRF origin guard is a no-op here.
 */
import { NextRequest, NextResponse } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";
import { routing } from "@/i18n/routing";

const DEVICES_PATH = "/dashboard/settings/devices";

function resolveLocale(req: NextRequest): string {
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  return cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)
    ? cookieLocale
    : routing.defaultLocale;
}

export async function GET(req: NextRequest) {
  const proxied = await coreProxy(req, "/v1/wearables/google/callback");

  const locale = resolveLocale(req);
  const target = new URL(`/${locale}${DEVICES_PATH}`, req.nextUrl.origin);
  target.searchParams.set("wearable", proxied.ok ? "connected" : "error");
  if (!proxied.ok) {
    const body = await proxied
      .clone()
      .json()
      .catch(() => null);
    const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
    if (typeof code === "string") target.searchParams.set("code", code);
  }

  const res = NextResponse.redirect(target, 302);
  // Preserve any rotated auth cookies coreProxy may have set when it had to
  // refresh an expired access token mid-callback.
  proxied.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
  return res;
}
