import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.meta");
  return {
    title: t("title"),
    description: t("description"),
    keywords: [
      "HealthOS", "NT208", "student project", "university course project",
      "health management app", "AI food recognition", "UIT Vietnam",
    ],
    alternates: {
      canonical: "/about",
      languages: { vi: "/vi/about", en: "/en/about", "x-default": "/vi/about" },
    },
    openGraph: {
      title: t("title"),
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
  description: "Academic health management project — NT208 course, UIT Vietnam",
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
