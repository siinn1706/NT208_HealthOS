import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/ui/ComingSoon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("leaderboard") };
}

export default function LeaderboardPage() {
  return <ComingSoon />;
}
