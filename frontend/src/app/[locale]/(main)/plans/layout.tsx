import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildLocaleMetadata } from "@/lib/seo/locale-metadata";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site-url";
import { plans } from "@/data/plans";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plans.meta");
  const locale = await getLocale();
  return {
    ...buildLocaleMetadata({
      locale,
      path: "/plans",
      title: t("title"),
      description: t("description"),
    }),
    keywords: [
      "HealthOS", "health plans", "calorie tracking", "BMI",
      "AI nutrition assistant", "NT208", "university project demo",
    ],
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
      availability: "https://schema.org/PreOrder",
      url: absoluteUrl(`/plans#${p.id}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD serialized via jsonLdScript() XSS-safe helper.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd) }}
      />
      {children}
    </>
  );
}
