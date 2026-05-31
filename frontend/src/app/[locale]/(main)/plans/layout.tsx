import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { plans } from "@/data/plans";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plans.meta");
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

export default function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "HealthOS Plans",
    description:
      "Subscription plans for HealthOS — comprehensive personal, family, and professional health monitoring.",
    brand: { "@type": "Brand", name: "HealthOS" },
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: p.name.en,
      price: p.price,
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      url: `https://healthos.vn/plans#${p.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD is serialized from static plan metadata.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {children}
    </>
  );
}
