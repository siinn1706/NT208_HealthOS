import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import OnboardingPageClient from "./OnboardingPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.meta");
  return { title: t("title") };
}

export default async function OnboardingPage() {
  // This page should only be accessible to authenticated users
  // The middleware will handle protection

  return <OnboardingPageClient />;
}
