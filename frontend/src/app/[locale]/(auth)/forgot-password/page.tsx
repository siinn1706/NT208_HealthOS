import { ForgotPasswordForm } from "@/components/shared/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: `${t("forgotPasswordTitle")} — HealthOS`,
    description: t("forgotPasswordSubtitle"),
  };
}

// Server Component: imports Client Component for the interactive form
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
