/**
 * BFF Onboarding Draft — proxy to Core BE /v1/users/me/onboarding-draft.
 *
 *   GET    /api/v1/users/me/onboarding-draft  → fetch saved draft
 *   PUT    /api/v1/users/me/onboarding-draft  → upsert draft (full replace)
 *   DELETE /api/v1/users/me/onboarding-draft  → drop draft (e.g. on completion)
 *
 * Contract (server-side):
 *   {
 *     data: OnboardingData,
 *     updated_at: ISO,
 *     expires_at: ISO,   // ~30d retention; carries pre-consent health data
 *   }
 *
 * The client autosaves to localStorage first (see `useOnboardingDraft`); this
 * route is the durable mirror so the user can resume on a different device or
 * after clearing site data. If Core has not yet shipped the endpoint we still
 * return whatever it does (typically 404), and the client falls back to the
 * local copy — see notes in `useOnboardingDraft.ts`.
 */
import { NextRequest } from "next/server";
import { coreProxy } from "@/lib/core-api-proxy";

const CORE_PATH = "/v1/users/me/onboarding-draft";

export async function GET(req: NextRequest) {
  return coreProxy(req, CORE_PATH);
}

export async function PUT(req: NextRequest) {
  return coreProxy(req, CORE_PATH, { method: "PUT" });
}

export async function DELETE(req: NextRequest) {
  return coreProxy(req, CORE_PATH, { method: "DELETE" });
}
