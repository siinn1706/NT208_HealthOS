import { getTranslations } from "next-intl/server";
import { Camera } from "lucide-react";
import { Link } from "@/navigation";
import { CameraCapture } from "@/components/dashboard/meals/CameraCapture";

export default async function MealSnapPage() {
  const t = await getTranslations("camera");
  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{t("aiSubtitle")}</p>
        </div>
        <Link
          href="/dashboard/meals/add"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          {t("manualEntry")}
        </Link>
      </div>

      {/* Camera/Upload capture component */}
      <CameraCapture />
    </div>
  );
}
