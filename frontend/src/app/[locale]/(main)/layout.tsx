import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SkipToMain } from "@/components/shared/SkipToMain";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.meta");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      siteName: "HealthOS",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
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

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HealthOS",
  url: "https://healthos.vn",
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD is serialized from a static object.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD is serialized from a static object.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <SkipToMain />
      <Navbar />
      <main id="main" className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
