import { getTranslations } from "next-intl/server";

import { getProfileData } from "@/lib/profile-data";
import { ProfileFormProvider } from "@/components/dashboard/profile";

// Server Component — data fetch happens here
export default async function ProfilePage() {
  const [t, profile] = await Promise.all([
    getTranslations("dashboard.profile"),
    getProfileData(),
  ]);

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Profile form (manages edit/view state itself) */}
      <ProfileFormProvider profile={profile} />
    </div>
  );
}
