import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.meta");
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

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HealthOS",
  url: "https://healthos.vn",
  logo: "https://healthos.vn/logo.png",
  sameAs: [],
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD is serialized from static organization metadata.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {children}
    </>
  );
}
