import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CirclePlus } from "lucide-react";
import { getMealsToday, getWeeklyCalorieChart, getNutritionSuggestions } from "@/lib/meals-data";
import { TodayMealsWidget } from "@/components/dashboard/widgets/TodayMealsWidget";
import { WeeklyCalorieChartWidget } from "@/components/dashboard/widgets/WeeklyCalorieChartWidget";
import { NutritionSuggestionsWidget } from "@/components/dashboard/widgets/NutritionSuggestionsWidget";
import { PageHeader } from "@/components/shared/page";

export default async function MealsPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations("dashboard.meals");
  const { locale } = await params;

  // Parallel data fetch
  const [meals, weeklyData, suggestions] = await Promise.all([
    getMealsToday(),
    getWeeklyCalorieChart(),
    getNutritionSuggestions(),
  ]);

  return (
    <>
      <PageHeader
        title={t("diary")}
        description={t("subtitle")}
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
