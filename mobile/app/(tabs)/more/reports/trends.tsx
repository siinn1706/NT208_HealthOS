import React, { useMemo, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PillGroup } from "@/components/ui/PillGroup";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { fetchTrend, type ReportPeriod } from "@/api/endpoints/reports";
import {
  reportMetricLabelKey,
  reportPeriodLabelKey,
  trendDirectionLabelKey,
} from "@/utils/report-copy";

const METRICS = ["heart_rate", "steps", "weight_kg", "sleep_minutes"] as const;
type MetricKey = (typeof METRICS)[number];
const PERIODS: ReportPeriod[] = ["7d", "30d", "90d"];

export default function TrendsScreen() {
  const t = useT();
  const { colors, fontWeights, typography, spacing } = useTheme();
  const [metric, setMetric] = useState<MetricKey>("heart_rate");
  const [period, setPeriod] = useState<ReportPeriod>("30d");

  const trend = useQuery({
    queryKey: ["trend", metric, period],
    queryFn: () => fetchTrend({ metric, period }),
  });

  const metricTitle = useMemo(() => t(reportMetricLabelKey(metric)), [t, metric]);
  const periodSubtitle = useMemo(() => t(reportPeriodLabelKey(period)), [t, period]);

  const metricOptions = useMemo(
    () =>
      METRICS.map((m) => ({
        value: m,
        label: t(reportMetricLabelKey(m)),
      })),
    [t]
  );

  const periodOptions = useMemo(
    () => PERIODS.map((p) => ({ value: p, label: t(reportPeriodLabelKey(p)) })),
    [t]
  );

  const trendKey = trend.data?.trend;
  const badgeTone =
    trendKey === "up" ? "success" : trendKey === "down" ? "danger" : "neutral";

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={trend.isFetching}
          onRefresh={() => trend.refetch()}
          tintColor={colors.brand}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("reports.trends")} />

      <Card>
        <PillGroup<MetricKey>
          accessibilityLabel={t("reports.metricSelector")}
          value={metric}
          onChange={setMetric}
          options={metricOptions}
          style={{ marginBottom: spacing.md }}
        />
        <PillGroup<ReportPeriod>
          accessibilityLabel={t("reports.periodSelector")}
          value={period}
          onChange={setPeriod}
          wrap={false}
          options={periodOptions}
        />
      </Card>

      {trend.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : trend.isError ? (
        <Card>
          <ErrorState error={trend.error} onRetry={() => trend.refetch()} />
        </Card>
      ) : (
        <>
          <DashboardSectionCard title={metricTitle} subtitle={periodSubtitle}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
                {t("reports.trendSummary")}
              </Text>
              <Badge tone={badgeTone}>{t(trendDirectionLabelKey(trend.data.trend))}</Badge>
            </View>
            {typeof trend.data.delta === "number" ? (
              <Text
                style={{
                  color: colors.brand,
                  fontWeight: fontWeights.bold,
                  fontSize: typography["2xl"].fontSize,
                  marginTop: spacing.xs,
                }}
              >
                {trend.data.delta > 0 ? "+" : ""}
                {trend.data.delta.toFixed(2)}
              </Text>
            ) : (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.sm.fontSize,
                  marginTop: spacing.xs,
                }}
              >
                —
              </Text>
            )}

            {(() => {
              const series = trend.data.series ?? [];
              if (series.length === 0) {
                return (
                  <View style={{ marginTop: spacing.lg }}>
                    <EmptyState title={t("reports.noData")} />
                  </View>
                );
              }
              return (
                <>
                  <View style={{ marginTop: spacing.md }}>
                    <TrendLineChart
                      series={series}
                      emptyMessage={t("reports.chartNotEnough")}
                    />
                  </View>
                  <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: fontWeights.semibold,
                        fontSize: typography.sm.fontSize,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {t("reports.recentValues")}
                    </Text>
                    {series.slice(-7).map((p) => (
                      <View key={p.date} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: colors.textMuted }}>{p.date}</Text>
                        <Text style={{ color: colors.text }}>{p.value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}
          </DashboardSectionCard>
        </>
      )}
    </ScreenScroll>
  );
}
