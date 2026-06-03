import { VerifyOTPForm } from "@/components/shared/auth";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildNoindexMetadata } from "@/lib/seo/locale-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("auth")]);
  return buildNoindexMetadata({
    locale,
    path: "/verify",
    title: `${t("verifyTitle")} — HealthOS`,
    description: t("verifySubtitle"),
  });
}

// Server Component: reads `email` from search params and passes it to the
// Client Component so the user knows which address received the OTP.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return <VerifyOTPForm email={email} />;
}
