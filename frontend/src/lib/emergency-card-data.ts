/**
 * Emergency Health Card — server-side data fetchers.
 *
 * Mirrors the cookie-forwarding pattern in `profile-data.ts` so the dashboard
 * page can fetch via the BFF using the caller's session cookie.
 *
 * Public-page fetcher (`getPublicEmergencyCard`) does NOT forward any
 * cookies — the upstream BFF route refuses to read the session and the
 * Core endpoint accepts unauthenticated calls. Keeping the helper cookie-
 * less on the FE side too means a logged-in owner viewing their own card
 * URL sees exactly what a responder sees.
 */
import { headers } from "next/headers";

import type {
  EmergencyProfileOwnerView,
  PublicEmergencyCard,
} from "@/lib/emergency-card-types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const EMPTY_OWNER_VIEW: EmergencyProfileOwnerView = {
  is_published: false,
  assistance_needed: [],
  equipment_notes: null,
  communication_notes: null,
  field_visibility: {},
  nkda_confirmed: false,
  preferred_language: null,
  last_published_at: null,
  card: {
    full_name: null,
    age_years: null,
    gender: null,
    preferred_language: null,
    blood_type: null,
    nkda_confirmed: false,
    allergies: [],
    chronic_conditions: [],
    medications: [],
    assistance_needed: [],
    equipment_notes: null,
    communication_notes: null,
    emergency_contacts: [],
    last_updated_at: null,
  },
  completeness_score: 0,
  missing_critical_fields: [],
  nudges: [],
  tokens: [],
  active_token_count: 0,
  max_active_tokens: 5,
};

export async function getEmergencyOwnerView(): Promise<{
  view: EmergencyProfileOwnerView;
  ok: boolean;
}> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${APP_URL}/api/v1/users/me/emergency-profile`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return { view: EMPTY_OWNER_VIEW, ok: false };
    const json = await res.json().catch(() => null);
    const view = (json?.data as EmergencyProfileOwnerView | undefined) ?? null;
    return view ? { view, ok: true } : { view: EMPTY_OWNER_VIEW, ok: false };
  } catch {
    return { view: EMPTY_OWNER_VIEW, ok: false };
  }
}

export type PublicCardResult =
  | { kind: "ok"; card: PublicEmergencyCard }
  | { kind: "gone" }
  | { kind: "rate_limited"; retry_after_s: number }
  | { kind: "error" };

/**
 * Server-side fetcher for the public `/e/<token>` page.
 *
 * Goes through the BFF public proxy so the privacy headers / Authorization-
 * stripping behavior is identical to a browser-direct request. We do NOT
 * forward request cookies — the public page must work for an unauthenticated
 * paramedic phone, and forwarding would risk Core seeing the wrong user.
 */
export async function getPublicEmergencyCard(token: string): Promise<PublicCardResult> {
  if (!token) return { kind: "gone" };
  try {
    const res = await fetch(
      `${APP_URL}/api/v1/public/emergency/${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        // No cookie forwarding — defensive (the upstream BFF would strip it
        // anyway, but staying explicit at every hop keeps the boundary
        // impossible to misread).
      }
    );
    if (res.status === 410 || res.status === 404) {
      return { kind: "gone" };
    }
    if (res.status === 429) {
      const json = await res.json().catch(() => null);
      const retry =
        Number(
          (json?.error?.details?.retry_after_s as number | undefined) ??
            res.headers.get("retry-after") ??
            60
        ) || 60;
      return { kind: "rate_limited", retry_after_s: retry };
    }
    if (!res.ok) return { kind: "error" };
    const json = await res.json().catch(() => null);
    const card = (json?.data as PublicEmergencyCard | undefined) ?? null;
    return card ? { kind: "ok", card } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
