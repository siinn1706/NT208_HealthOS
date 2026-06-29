import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page";
import { AddHealthMetricForm } from "@/components/dashboard/health/AddHealthMetricForm";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("vitalsDevices") };
}

export default async function AddHealthMetricPage() {
  const t = await getTranslations("dashboard.health");

  return (
    <>
      <PageHeader
        title={t("addMetric")}
        description={t("addMetricSubtitle")}
      />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <AddHealthMetricForm />
      </div>
    </>
  );
}
