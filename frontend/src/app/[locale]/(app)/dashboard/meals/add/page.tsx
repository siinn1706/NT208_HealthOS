import { getTranslations } from "next-intl/server";
import { AddMealForm } from "@/components/dashboard/meals/AddMealForm";
import { PageHeader } from "@/components/shared/page";

export default async function AddMealPage() {
  const t = await getTranslations("addMeal");
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <AddMealForm />
      </div>
    </>
  );
}
