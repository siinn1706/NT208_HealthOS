import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Camera, CirclePlus } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("nutrition") };
}
import { getMealsToday, getWeeklyCalorieChart, getNutritionSuggestions } from "@/lib/meals-data";
import { TodayMealsWidget } from "@/components/dashboard/widgets/TodayMealsWidget";
import { WeeklyCalorieChartWidget } from "@/components/dashboard/widgets/WeeklyCalorieChartWidget";
import { NutritionSuggestionsWidget } from "@/components/dashboard/widgets/NutritionSuggestionsWidget";
import { PageHeader } from "@/components/shared/page";

export default async function MealsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [t, cameraT, { locale }, [meals, weeklyData, suggestions]] = await Promise.all([
    getTranslations("dashboard.meals"),
    getTranslations("camera"),
    params,
    Promise.all([
      getMealsToday(),
      getWeeklyCalorieChart(),
      getNutritionSuggestions(),
    ]),
  ]);

  return (
    <>
      <PageHeader
        title={t("diary")}
        description={t("subtitle")}
        secondaryActions={
          <Link
            href={`/${locale}/dashboard/meals/snap`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Camera className="size-4" />
            {cameraT("title")}
          </Link>
        }
        primaryAction={
          <Link
            href={`/${locale}/dashboard/meals/add`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <CirclePlus className="size-4" />
            {t("addMeal")}
          </Link>
        }
      />
      <div className="max-w-[1400px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* ── Row 1: Today meals (left 2/3) + Suggestions (right 1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TodayMealsWidget meals={meals} />
        </div>
        <div className="lg:col-span-1">
          <NutritionSuggestionsWidget suggestions={suggestions} />
        </div>
      </div>

      {/* ── Row 2: Weekly calorie chart ── */}
      <WeeklyCalorieChartWidget data={weeklyData} />
      </div>
    </>
  );
}
