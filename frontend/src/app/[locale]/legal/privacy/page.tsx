import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

interface PrivacyPageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PrivacyPageParams): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.privacy.meta" });
  return {
    title: `${t("title")} — HealthOS`,
    description: t("description"),
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPolicyPage({ params }: PrivacyPageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  const sectionKeys = ["collect", "use", "share", "retention", "rights", "contact"] as const;

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
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`sections.${key}.body` as Parameters<typeof t>[0])}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
