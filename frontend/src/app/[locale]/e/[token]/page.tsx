/**
 * Public Emergency Card route — `/<locale>/e/<token>`.
 *
 * UNAUTHENTICATED, mobile-first server-component shell. The fetcher routes
 * through the BFF public proxy which strips any Authorization / cookie
 * forwarding, so a logged-in owner who happens to scan their own QR sees
 * exactly what an unauthenticated paramedic sees.
 *
 * Privacy posture:
 *   * Lives OUTSIDE the `(app)` group so it does not inherit auth-gated
 *     layouts.
 *   * `generateMetadata` returns `robots: { index: false, follow: false }`.
 *   * SSR — readable instantly on flaky 3G in an ER waiting room with no
 *     client JS dependencies beyond the framework.
 *   * 410 Gone / 429 Rate-Limited states render generic copy that does NOT
 *     identify the card owner — same content for "missing", "revoked",
 *     "user soft-deleted", "card unpublished".
 */
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Activity, AlertTriangle, Clock, Shield } from "lucide-react";

import { EmergencyCardView } from "@/components/dashboard/emergency-card/EmergencyCardView";
import { getPublicEmergencyCard } from "@/lib/emergency-card-data";
import { formatDate } from "@/lib/format-utils";

// Hard-disable every Next.js cache layer for this route. The BFF API route
// also sets `Cache-Control: no-store`, but the rendered HTML page is a
// separate response and would otherwise be eligible for build-time / ISR /
// CDN caching. A revoked card MUST stop being viewable immediately.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PublicCardPageProps {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: PublicCardPageProps): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "publicEmergency.meta" });
  // ALWAYS return noindex/nofollow — emergency card URLs MUST never appear
  // in a search engine result.
  return {
    title: t("title"),
    description: t("description"),
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
      nocache: true,
    },
    // Don't expose Open Graph metadata either — preview-card scrapers
    // would otherwise cache the patient name as a "site:emergency.healthos"
    // entry the next time a clinician uploads the URL into Slack.
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
    },
  };
}

export default async function PublicEmergencyPage({ params }: PublicCardPageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "publicEmergency" });
  const result = await getPublicEmergencyCard(token);

  if (result.kind === "rate_limited") {
    return (
      <PublicShell>
        <StatusCard
          tone="warning"
          icon={Clock}
          title={t("rateLimitedTitle")}
          body={t("rateLimitedBody", { seconds: result.retry_after_s })}
        />
      </PublicShell>
    );
  }

  if (result.kind === "gone" || result.kind === "error") {
    return (
      <PublicShell>
        <StatusCard
          tone="muted"
          icon={AlertTriangle}
          title={t("goneTitle")}
          body={t("goneBody")}
          /* U5 — tiny actionable hint for responders even when we cannot */
          /* show patient data: emergency-number reminder. */
          footnote={t("emergencyNumberHint")}
        />
      </PublicShell>
    );
  }

  const card = result.card;
  const provenanceLine = card.last_updated_at
    ? t("provenance.updatedAt", { date: formatDate(card.last_updated_at, locale) })
    : null;

  return (
    <PublicShell>
      <EmergencyCardView
        card={card}
        locale={locale}
        provenanceLine={provenanceLine}
        enablePrintLayout
      />
      {/* Trust strip — small, gives the responder context for "where did
          this data come from?" so they can corroborate identity offline. */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Shield className="size-3" aria-hidden />
        <span>{t("trustNote")}</span>
      </div>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  // Minimal page chrome — no top nav, no footer beyond the card itself,
  // no theming switcher. The viewer is in an emergency, not browsing.
  return (
    <main className="min-h-dvh bg-background px-3 py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[480px]">{children}</div>
    </main>
  );
}

function StatusCard({
  tone,
  icon: Icon,
  title,
  body,
  footnote,
}: {
  tone: "warning" | "muted";
  icon: React.ElementType;
  title: string;
  body: string;
  footnote?: string;
}) {
  const cls =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300"
      : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-2xl border px-5 py-8 text-center ${cls}`}>
      <Icon className="mx-auto size-10 opacity-80" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm opacity-90">{body}</p>
      {footnote && (
        <p className="mt-3 rounded-md border border-current/20 px-3 py-2 text-xs font-medium opacity-90">
          {footnote}
        </p>
      )}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] opacity-70">
        <Activity className="size-3" aria-hidden />
        <span>HealthOS</span>
      </div>
    </div>
  );
}
