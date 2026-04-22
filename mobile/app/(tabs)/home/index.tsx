import React, { useMemo } from "react";
import { RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { Card } from "@/components/ui/Card";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { CompactChartCard } from "@/components/dashboard/compact-chart-card";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardKpiSkeletonGrid } from "@/components/dashboard/dashboard-skeletons";
import { GoalProgressCard } from "@/components/dashboard/goal-progress-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { KpiMiniCard } from "@/components/dashboard/kpi-mini-card";
import { KpiSummaryGrid } from "@/components/dashboard/kpi-summary-grid";
import { QuickActionTile } from "@/components/dashboard/quick-action-tile";
import { QuickActionsGrid } from "@/components/dashboard/quick-actions-grid";
import { ReminderPreviewItem } from "@/components/dashboard/reminder-preview-item";
import { VitalsLineChart } from "@/components/charts/VitalsLineChart";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { HomeHero } from "./home-hero";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { queryKeys } from "@/api/queryKeys";
import { fetchDashboardSummary } from "@/api/endpoints/dashboard";
import { fetchVitalsTimeseries, type VitalPoint } from "@/api/endpoints/vitals";
import { fetchUpcomingReminders, type Reminder } from "@/api/endpoints/reminders";
import { fetchNutritionSuggestions } from "@/api/endpoints/nutrition";
import { displayLabel, sessionStore } from "@/auth/session";
import {
  formatKpiValueDisplay,
  goalKeyLabel,
  insightPrimaryBadgeLabel,
  kpiLabelForMetric,
  kpiUnitForMetric,
  mapAlertsForBanner,
  nutritionSuggestionTitle,
  reminderRepeatLabel,
  reminderTypeLabel,
  selectHomeKpiKeys,
} from "@/utils/dashboard-copy";

function QuickActionsBlock({
  onMealsAdd,
  onMealsSnap,
  onHealthMetric,
  onReminderAdd,
  t,
}: {
  onMealsAdd: () => void;
  onMealsSnap: () => void;
  onHealthMetric: () => void;
  onReminderAdd: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <DashboardSectionCard title={t("home.quickActionsTitle")}>
      <QuickActionsGrid>
        <QuickActionTile title={t("home.quickLogMeal")} iconName="restaurant-outline" onPress={onMealsAdd} />
        <QuickActionTile title={t("home.quickScanMeal")} iconName="scan-outline" onPress={onMealsSnap} />
        <QuickActionTile title={t("home.quickLogReading")} iconName="pulse-outline" onPress={onHealthMetric} />
        <QuickActionTile title={t("home.quickAddReminder")} iconName="alarm-outline" onPress={onReminderAdd} />
      </QuickActionsGrid>
    </DashboardSectionCard>
  );
}

function RemindersBlock({
  reminders,
  onViewAll,
  t,
}: {
  reminders: UseQueryResult<Reminder[], Error>;
  onViewAll: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <DashboardSectionCard
      title={t("home.upcomingReminders")}
      headerActionLabel={t("home.viewAllReminders")}
      onHeaderActionPress={onViewAll}
    >
      {reminders.isPending && !reminders.data ? (
        <LoadingState />
      ) : reminders.isError && !reminders.data ? (
        <ErrorState error={reminders.error} onRetry={() => reminders.refetch()} />
      ) : !reminders.data || reminders.data.length === 0 ? (
        <EmptyState title={t("reminders.noReminders")} />
      ) : (
        <View>
          {reminders.data.slice(0, 3).map((r, idx, arr) => (
            <ReminderPreviewItem
              key={r.id}
              title={r.title}
              metaLine={`${r.time} · ${reminderRepeatLabel(r.repeat, t)}`}
              typeLabel={reminderTypeLabel(r.type, t)}
              isLast={idx === arr.length - 1}
            />
          ))}
        </View>
      )}
    </DashboardSectionCard>
  );
}

function VitalsBlock({
  vitals,
  onOpenHealth,
  t,
}: {
  vitals: UseQueryResult<VitalPoint[], Error>;
  onOpenHealth: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <CompactChartCard
      title={t("home.vitals7d")}
      headerActionLabel={t("home.openHealth")}
      onHeaderActionPress={onOpenHealth}
    >
      {vitals.isPending && !vitals.data ? (
        <LoadingState />
      ) : vitals.isError && !vitals.data ? (
        <ErrorState error={vitals.error} onRetry={() => vitals.refetch()} />
      ) : (
        <VitalsLineChart
          data={vitals.data ?? []}
          metric="heart_rate"
          height={140}
          emptyMessage={t("home.vitalsChartNotEnoughData")}
        />
      )}
    </CompactChartCard>
  );
}

export default function HomeScreen() {
  const t = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const user = sessionStore((s) => s.user);

  const summary = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: fetchDashboardSummary,
  });

  const vitals = useQuery({
    queryKey: queryKeys.vitals.timeseries(7),
    queryFn: () => fetchVitalsTimeseries(7),
  });

  const reminders = useQuery({
    queryKey: queryKeys.reminders.upcoming(),
    queryFn: fetchUpcomingReminders,
  });

  const nutrition = useQuery({
    queryKey: queryKeys.nutrition.suggestions(),
    queryFn: fetchNutritionSuggestions,
  });

  const refreshing =
    summary.isFetching ||
    vitals.isFetching ||
    reminders.isFetching ||
    nutrition.isFetching;

  const onRefresh = () => {
    summary.refetch();
    vitals.refetch();
    reminders.refetch();
    nutrition.refetch();
  };

  const greetingName = summary.data?.user_name ?? displayLabel(user) ?? "";

  const greetingLine = useMemo(() => {
    const hour = new Date().getHours();
    const key =
      hour < 12 ? "home.greetingMorning" : hour < 18 ? "home.greetingAfternoon" : "home.greetingEvening";
    return t(key, { name: greetingName.trim() || t("common.loading") });
  }, [greetingName, t]);

  const statusChipLabel = useMemo(() => {
    const n = summary.data?.alerts?.length ?? 0;
    if (n === 1) return t("home.statusChipAlertSingular");
    if (n > 1) return t("home.statusChipAlerts", { count: n });
    const kpis = summary.data?.kpis;
    if (kpis && Object.keys(kpis).length > 0) return t("home.statusChipOnTrack");
    return t("home.statusChipGettingStarted");
  }, [summary.data?.alerts?.length, summary.data?.kpis, t]);

  const dash = summary.data;
  const kpiKeys = useMemo(() => selectHomeKpiKeys(dash?.kpis), [dash?.kpis]);
  const alertItems = dash?.alerts ? mapAlertsForBanner(dash.alerts, t) : [];

  const insightBody = dash?.ai_insight?.text?.trim() ?? null;
  const nutritionLead = nutrition.data?.[0];
  const showInsightSurface = Boolean(dash && (insightBody || nutritionLead));

  const goalRows = (() => {
    const goals = dash?.goals ?? [];
    return goals.map((g) => {
      const label = goalKeyLabel(g.key, t);
      const cur = g.current;
      const tgt = g.target;
      const unit = g.unit?.trim() ? ` ${g.unit}` : "";
      const valueLine =
        cur !== null && cur !== undefined
          ? `${formatKpiValueDisplay(cur)}${unit}`
          : tgt !== null && tgt !== undefined
            ? t("home.goalValuePending")
            : "—";
      const progressLabel =
        tgt !== null && tgt !== undefined
          ? t("home.goalTargetLine", {
              value: formatKpiValueDisplay(tgt),
              unit: g.unit?.trim() ? ` ${g.unit}` : "",
            })
          : null;
      return { id: g.id, label, valueLine, progressLabel };
    });
  })();

  const dashboardFatal = summary.isError && !summary.data;
  const dashboardPendingFirst = summary.isPending && !summary.data;
  const showKpiBlock = Boolean(dash && kpiKeys.length > 0);

  const nav = {
    mealsAdd: () => router.push("/(tabs)/meals/add"),
    mealsSnap: () => router.push("/(tabs)/meals/snap"),
    healthMetric: () => router.push("/(tabs)/health/metrics/heart_rate"),
    reminderAdd: () => router.push("/(tabs)/more/reminders/add"),
    remindersList: () => router.push("/(tabs)/more/reminders"),
    chat: () => router.push("/(tabs)/chat"),
    goal: () => router.push("/(tabs)/health/goal"),
    health: () => router.push("/(tabs)/health"),
  };

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
    >
      <HomeHero
        greetingLine={greetingLine}
        subtitle={t("home.heroSubtitle")}
        statusChipLabel={statusChipLabel}
      />

      {dashboardFatal ? (
        <Card>
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        </Card>
      ) : null}

      {!dashboardFatal && dashboardPendingFirst ? <DashboardKpiSkeletonGrid /> : null}

      {!dashboardFatal && dash ? (
        <>
          {alertItems.length > 0 ? (
            <DashboardSectionCard title={t("home.alerts")}>
              <AlertBanner items={alertItems} />
            </DashboardSectionCard>
          ) : null}

          {showKpiBlock ? (
            <DashboardSectionCard title={t("home.todayKpis")}>
              <KpiSummaryGrid>
                {kpiKeys.map((key) => {
                  const kpi = dash.kpis[key];
                  if (!kpi) return null;
                  const unit = kpiUnitForMetric(key);
                  const display = formatKpiValueDisplay(kpi.current);
                  const targetLine =
                    kpi.target !== null && kpi.target !== undefined
                      ? t("home.kpiTarget", { value: String(kpi.target) })
                      : null;
                  return (
                    <KpiMiniCard
                      key={key}
                      label={kpiLabelForMetric(key, t)}
                      valueDisplay={display}
                      unit={unit}
                      targetLine={targetLine}
                    />
                  );
                })}
              </KpiSummaryGrid>
            </DashboardSectionCard>
          ) : null}
        </>
      ) : null}

      {!dashboardFatal ? (
        <>
          <QuickActionsBlock
            t={t}
            onMealsAdd={nav.mealsAdd}
            onMealsSnap={nav.mealsSnap}
            onHealthMetric={nav.healthMetric}
            onReminderAdd={nav.reminderAdd}
          />

          <RemindersBlock reminders={reminders} onViewAll={nav.remindersList} t={t} />

          {!dashboardFatal && dash && showInsightSurface ? (
            <DashboardSectionCard title={t("home.sectionInsight")}>
              <InsightCard
                primaryBadgeLabel={
                  insightBody ? insightPrimaryBadgeLabel(dash.ai_insight, t) : t("home.nutritionInInsightBadge")
                }
                primaryBody={
                  insightBody
                    ? insightBody
                    : nutritionLead
                      ? `${nutritionLead.title}\n\n${nutritionLead.message}`
                      : null
                }
                secondaryTitle={
                  insightBody && nutritionLead ? nutritionSuggestionTitle(nutritionLead, t) : null
                }
                secondaryBody={insightBody && nutritionLead ? nutritionLead.message : null}
                ctaLabel={t("home.insightCta")}
                onCtaPress={nav.chat}
              />
            </DashboardSectionCard>
          ) : null}

          {!dashboardFatal && dash && goalRows.length > 0 ? (
            <DashboardSectionCard
              title={t("home.sectionGoals")}
              headerActionLabel={t("home.viewGoal")}
              onHeaderActionPress={nav.goal}
            >
              <GoalProgressCard rows={goalRows} />
            </DashboardSectionCard>
          ) : null}

          <VitalsBlock vitals={vitals} onOpenHealth={nav.health} t={t} />
        </>
      ) : null}
    </ScreenScroll>
  );
}
