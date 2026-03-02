import { RegisterForm } from "@/components/shared/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: `${t("registerTitle")} — HealthOS`,
    description: t("registerSubtitle"),
  };
}

// Server Component: imports Client Component for the interactive form
export default function RegisterPage() {
  return <RegisterForm />;
}
