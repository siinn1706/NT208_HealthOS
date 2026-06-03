import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildLocaleMetadata } from "@/lib/seo/locale-metadata";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("services.meta");
  const locale = await getLocale();
  return {
    ...buildLocaleMetadata({
      locale,
      path: "/services",
      title: t("title"),
      description: t("description"),
    }),
    keywords: [
      "HealthOS", "AI meal analysis", "calorie tracking",
      "BMI tracking", "health management app", "NT208", "Vietnam",
    ],
  };
}

export default async function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("services");
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Digital Health Platform",
    provider: { "@type": "Organization", name: "HealthOS", url: absoluteUrl("/") },
    name: t("title"),
    description: t("subtitle"),
    areaServed: { "@type": "Country", name: "Vietnam" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t("overviewTitle"),
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: t("tab1Label"), description: t("tab1Desc") } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: t("tab2Label"), description: t("tab2Desc") } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: t("tab3Label"), description: t("tab3Desc") } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: t("tab4Label"), description: t("tab4Desc") } },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD serialized via jsonLdScript() XSS-safe helper.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(serviceJsonLd) }}
      />
      {children}
    </>
  );
}
