import { getTranslations } from "next-intl/server";
import { Camera } from "lucide-react";
import { Link } from "@/navigation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.meals");
  return { title: t("snapPage") };
}
import { CameraCapture } from "@/components/dashboard/meals/CameraCapture";
import { PageHeader } from "@/components/shared/page";

export default async function MealSnapPage() {
  const t = await getTranslations("camera");
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-muted-foreground" aria-hidden />
            {t("title")}
          </span>
        }
        description={t("aiSubtitle")}
        secondaryActions={
          <Link
            href="/dashboard/meals/add"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            {t("manualEntry")}
          </Link>
        }
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <CameraCapture />
      </div>
    </>
  );
}
