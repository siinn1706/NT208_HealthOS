import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SkipToMain } from "@/components/shared/SkipToMain";
import { buildLocaleMetadata } from "@/lib/seo/locale-metadata";
import { organizationJsonLd, websiteJsonLd, jsonLdScript } from "@/lib/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.meta");
  const locale = await getLocale();
  return {
    ...buildLocaleMetadata({
      locale,
      path: "",
      title: t("title"),
      description: t("description"),
    }),
    keywords: [
      "HealthOS", "NT208", "đồ án môn học", "health management app",
      "calorie tracking", "AI food recognition", "BMI tracking", "Vietnam",
    ],
  };
}

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
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD serialized via jsonLdScript() XSS-safe helper.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // oxlint-disable-next-line react-doctor/no-danger -- JSON-LD serialized via jsonLdScript() XSS-safe helper.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
      />
      <SkipToMain />
      <Navbar />
      <main id="main" className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
