import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

interface HealthDataPageParams {
  params: Promise<{ locale: string }>;
}

/**
 * Standalone "Health data" privacy policy page.
 *
 * Required by Google Play Store policy and Android Health Connect itself
 * — the system permission dialog renders a "View privacy policy" link
 * that points here via the `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`
 * intent filter declared in `mobile/app.config.ts`.
 *
 * Keep the copy specific to what we actually do with health data so the
 * policy page passes Play review:
 *   - exact data types we read
 *   - what we do (and don't) store
 *   - source app attribution
 *   - revocation + deletion paths
 */
export async function generateMetadata({
  params,
}: HealthDataPageParams): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.healthData.meta" });
  return {
    title: `${t("title")} — HealthOS`,
    description: t("description"),
    robots: { index: true, follow: true },
  };
}

export default async function HealthDataPolicyPage({
  params,
}: HealthDataPageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.healthData" });

  const sectionKeys = [
    "what",
    "how",
    "storage",
    "sharing",
    "revocation",
    "deletion",
    "contact",
  ] as const;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <p className="text-xs text-muted-foreground">{t("lastUpdated")}</p>
      </header>

      <div className="mt-8 space-y-8">
        {sectionKeys.map((key) => (
          <section key={key} className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              {t(`sections.${key}.title` as Parameters<typeof t>[0])}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {t(`sections.${key}.body` as Parameters<typeof t>[0])}
            </p>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        {t("footer.see")}{" "}
        <Link href="/legal/privacy" className="underline">
          {t("footer.generalPolicy")}
        </Link>
      </footer>
    </main>
  );
}
