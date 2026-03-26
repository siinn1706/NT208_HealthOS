import { getTranslations } from "next-intl/server";
import { AddMealForm } from "@/components/dashboard/meals/AddMealForm";

export default async function AddMealPage() {
  const t = await getTranslations("addMeal");
  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
      </div>

      <AddMealForm />
    </div>
  );
}
