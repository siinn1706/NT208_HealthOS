/**
 * Emergency Health Card — owner dashboard route.
 *
 * Server Component shell that fetches the owner's `EmergencyProfileOwnerView`
 * (preview + tokens + completeness nudges) plus the most recent 50 access
 * log entries, then hands them to the client `EmergencyCardManager` component.
 *
 * On a brand-new account (no `emergency_profiles` row, `is_published=false`,
 * zero tokens) we render the `ConsentExplainer` first-visit screen instead.
 *
 * Auth is enforced by the `(app)` layout group + middleware — no extra
 * gating needed here.
 */
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { HeartPulse } from "lucide-react";

import { ConsentExplainer } from "@/components/dashboard/emergency-card/ConsentExplainer";
import { EmergencyCardManager } from "@/components/dashboard/emergency-card/EmergencyCardManager";
import { PageHeader } from "@/components/shared/page";
import { getEmergencyOwnerView } from "@/lib/emergency-card-data";
import type { EmergencyAccessLog } from "@/lib/emergency-card-types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getInitialAccessLogs(): Promise<EmergencyAccessLog[]> {
  try {
    const reqHeaders = await headers();
    const res = await fetch(
      `${APP_URL}/api/v1/users/me/emergency-profile/access-logs?limit=50`,
      {
        cache: "no-store",
        headers: { cookie: reqHeaders.get("cookie") ?? "" },
      }
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return (json?.data as EmergencyAccessLog[] | undefined) ?? [];
  } catch {
    return [];
  }
}

export default async function EmergencyCardPage() {
  const [t, owner, logs] = await Promise.all([
    getTranslations("dashboard.emergencyCard"),
    getEmergencyOwnerView(),
    getInitialAccessLogs(),
  ]);

  const view = owner.view;
  const showConsent =
    !view.is_published && view.tokens.length === 0 && !view.last_published_at;
  const hasMinimumProfile = Boolean(view.card.full_name);

  return (
    <>
      {/* F2 — wrap dashboard chrome in ec-print-hide so window.print() */}
      {/* produces a clean wallet card without the page header. */}
      <div className="ec-print-hide">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <HeartPulse className="size-5 text-red-600" aria-hidden />
              {t("pageTitle")}
            </span>
          }
          description={t("pageSubtitle")}
        />
      </div>
      <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {showConsent ? (
          <ConsentExplainer hasMinimumProfile={hasMinimumProfile} />
        ) : (
          <EmergencyCardManager view={view} initialLogs={logs} />
        )}
      </div>
    </>
  );
}
