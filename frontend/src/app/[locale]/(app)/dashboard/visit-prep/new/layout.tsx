import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("visitPrep") };
}

export default function VisitPrepNewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
