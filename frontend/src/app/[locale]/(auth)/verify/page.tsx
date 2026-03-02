import { VerifyOTPForm } from "@/components/shared/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: `${t("verifyTitle")} — HealthOS`,
    description: t("verifySubtitle"),
  };
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
