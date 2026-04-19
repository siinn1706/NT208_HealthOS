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

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
