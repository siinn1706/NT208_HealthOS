import { ForgotPasswordForm } from "@/components/shared/auth";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildNoindexMetadata } from "@/lib/seo/locale-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("auth")]);
  return buildNoindexMetadata({
    locale,
    path: "/forgot-password",
    title: `${t("forgotPasswordTitle")} — HealthOS`,
    description: t("forgotPasswordSubtitle"),
  });
}

// Server Component: imports Client Component for the interactive form
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
