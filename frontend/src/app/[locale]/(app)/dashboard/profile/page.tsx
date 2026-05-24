import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("profile") };
}

import { getProfileData } from "@/lib/profile-data";
import { ProfileFormProvider } from "@/components/dashboard/profile";
import { LinkedAccountsSection } from "@/components/dashboard/profile/LinkedAccountsSection";
import { PageHeader } from "@/components/shared/page";

export default async function ProfilePage() {
  const [t, profile] = await Promise.all([
    getTranslations("dashboard.profile"),
    getProfileData(),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="max-w-[900px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <ProfileFormProvider profile={profile} />
        <LinkedAccountsSection />
      </div>
    </>
  );
}
