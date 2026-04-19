import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("services.meta");
  return {
    title: `${t("title")} — HealthOS`,
    description: t("description"),
    openGraph: {
      title: `${t("title")} — HealthOS`,
      description: t("description"),
      type: "website",
    },
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
    provider: { "@type": "Organization", name: "HealthOS" },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      {children}
    </>
  );
}
