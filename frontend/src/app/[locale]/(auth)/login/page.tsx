import { LoginForm } from "@/components/shared/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: `${t("loginTitle")} — HealthOS`,
    description: t("loginSubtitle"),
  };
}

// Server Component: imports Client Component for the interactive form
export default function LoginPage() {
  return <LoginForm />;
}
