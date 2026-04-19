import React, { useMemo } from "react";
import { Text, View, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { VitalsLineChart } from "@/components/charts/VitalsLineChart";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import {
  fetchDashboardSummary,
  type DashboardAlert,
  type KpiValue,
} from "@/api/endpoints/dashboard";
import { fetchVitalsTimeseries } from "@/api/endpoints/vitals";
import { fetchUpcomingReminders } from "@/api/endpoints/reminders";
import { fetchNutritionSuggestions } from "@/api/endpoints/nutrition";
import { displayLabel, sessionStore } from "@/auth/session";

const KPI_LABEL_KEYS: Record<string, string> = {
  steps: "home.kpiSteps",
  heart_rate: "home.kpiHeartRate",
  sleep_minutes: "home.kpiSleep",
  weight_kg: "home.kpiWeight",
  blood_pressure_systolic: "home.kpiSystolic",
  blood_pressure_diastolic: "home.kpiDiastolic",
};

const KPI_UNITS: Record<string, string> = {
  steps: "",
  heart_rate: "bpm",
  sleep_minutes: "min",
  weight_kg: "kg",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
};

function alertTone(type: string): "danger" | "warning" | "info" | "neutral" {
  const lower = type.toLowerCase();
  if (lower.includes("danger") || lower.includes("critical") || lower.includes("error")) {
    return "danger";
  }
  if (lower.includes("warn")) return "warning";
  if (lower.includes("info") || lower.includes("notice")) return "info";
  return "neutral";
}

export default function HomeScreen() {
  const t = useT();
  const { colors, fontWeights, typography, spacing } = useTheme();
  const user = sessionStore((s) => s.user);

  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
  });

  const vitals = useQuery({
    queryKey: ["vitals", 7],
    queryFn: () => fetchVitalsTimeseries(7),
  });

  const reminders = useQuery({
    queryKey: ["reminders", "upcoming"],
    queryFn: fetchUpcomingReminders,
  });

  const nutrition = useQuery({
    queryKey: ["nutrition", "suggestions"],
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

  const kpiEntries = useMemo<Array<[string, KpiValue]>>(() => {
    const kpis = summary.data?.kpis;
    if (!kpis || typeof kpis !== "object") return [];
    return Object.entries(kpis);
  }, [summary.data?.kpis]);

  const greetingName = summary.data?.user_name ?? displayLabel(user) ?? "";

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand}
        />
      }
    >
      <PageHeader title={t("home.greeting", { name: greetingName })} />

      {summary.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : summary.isError ? (
        <Card>
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        </Card>
      ) : (
        <>
          {kpiEntries.length > 0 ? (
            <Card>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: fontWeights.semibold,
                  fontSize: typography.lg.fontSize,
                  marginBottom: spacing.sm,
                }}
              >
                {t("home.todayKpis")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
                {kpiEntries.map(([key, kpi]) => {
                  const labelKey = KPI_LABEL_KEYS[key];
                  const label = labelKey ? t(labelKey) : key.replace(/_/g, " ");
                  const unit = KPI_UNITS[key] ?? "";
                  const display =
                    kpi.current === null || kpi.current === undefined
                      ? "—"
                      : Number.isInteger(kpi.current)
                        ? String(kpi.current)
                        : kpi.current.toFixed(1);
                  return (
                    <View
                      key={key}
                      style={{
                        flexBasis: "47%",
                        backgroundColor: colors.surfaceMuted,
                        padding: spacing.md,
                        borderRadius: 12,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                        {label}
                      </Text>
                      <Text style={{ color: colors.text, fontWeight: fontWeights.bold, fontSize: typography["xl"].fontSize }}>
                        {display}
                        {unit ? (
                          <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, fontWeight: fontWeights.regular }}>
                            {" "}
                            {unit}
                          </Text>
                        ) : null}
                      </Text>
                      {kpi.target !== null && kpi.target !== undefined ? (
                        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                          {t("home.kpiTarget", { value: String(kpi.target) })}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          <Card>
            <Text
              style={{
                color: colors.text,
                fontWeight: fontWeights.semibold,
                fontSize: typography.lg.fontSize,
                marginBottom: spacing.sm,
              }}
            >
              {t("home.alerts")}
            </Text>
            {summary.data.alerts && summary.data.alerts.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                {summary.data.alerts.map((a: DashboardAlert) => (
                  <View
                    key={a.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: spacing.sm,
                    }}
                  >
                    <Badge tone={alertTone(a.type)}>{a.type}</Badge>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text }}>
                        {a.message}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: colors.textMuted }}>{t("home.noAlerts")}</Text>
            )}
          </Card>

          {summary.data.ai_insight ? (
            <Card>
              <Badge tone="brand">{t("home.aiInsight")}</Badge>
              <Text
                style={{
                  color: colors.text,
                  marginTop: spacing.sm,
                  fontSize: typography.base.fontSize,
                }}
              >
                {summary.data.ai_insight.text}
              </Text>
            </Card>
          ) : null}
        </>
      )}

      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.lg.fontSize,
            marginBottom: spacing.sm,
          }}
        >
          {t("home.vitals7d")}
        </Text>
        {vitals.isPending ? (
          <LoadingState />
        ) : vitals.isError ? (
          <ErrorState error={vitals.error} onRetry={() => vitals.refetch()} />
        ) : (
          <VitalsLineChart data={vitals.data} metric="heart_rate" />
        )}
      </Card>

      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.lg.fontSize,
            marginBottom: spacing.sm,
          }}
        >
          {t("home.upcomingReminders")}
        </Text>
        {reminders.isPending ? (
          <LoadingState />
        ) : reminders.isError ? (
          <ErrorState error={reminders.error} onRetry={() => reminders.refetch()} />
        ) : reminders.data.length === 0 ? (
          <EmptyState title={t("reminders.noReminders")} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {reminders.data.slice(0, 3).map((r) => (
              <View
                key={r.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>
                    {r.title}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                    {r.time} · {r.repeat}
                  </Text>
                </View>
                <Badge tone="neutral">{r.type}</Badge>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.lg.fontSize,
            marginBottom: spacing.sm,
          }}
        >
          {t("home.nutritionTip")}
        </Text>
        {nutrition.isPending ? (
          <LoadingState />
        ) : nutrition.isError ? (
          <ErrorState error={nutrition.error} onRetry={() => nutrition.refetch()} />
        ) : nutrition.data.length === 0 ? (
          <EmptyState title={t("common.emptyTitle")} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {nutrition.data.slice(0, 2).map((s) => (
              <View key={s.id ?? s.title} style={{ gap: 2 }}>
                <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
                  {s.title}
                </Text>
                <Text style={{ color: colors.textMuted }}>{s.message}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScreenScroll>
  );
}
