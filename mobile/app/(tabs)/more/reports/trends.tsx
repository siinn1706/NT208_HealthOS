import React, { useState } from "react";
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
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { fetchTrend, type ReportPeriod } from "@/api/endpoints/reports";

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
          accessibilityLabel="Metric"
          value={metric}
          onChange={setMetric}
          options={METRICS.map((m) => ({
            value: m,
            label: m.replace(/_/g, " "),
          }))}
          style={{ marginBottom: spacing.md }}
        />
        <PillGroup<ReportPeriod>
          accessibilityLabel="Period"
          value={period}
          onChange={setPeriod}
          wrap={false}
          options={PERIODS.map((p) => ({ value: p, label: p }))}
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
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>{metric}</Text>
            <Badge tone={trend.data.trend === "up" ? "success" : trend.data.trend === "down" ? "danger" : "neutral"}>
              {trend.data.trend ?? "—"}
            </Badge>
          </View>
          {typeof trend.data.delta === "number" ? (
            <Text style={{ color: colors.brand, fontWeight: fontWeights.bold, fontSize: typography["2xl"].fontSize, marginTop: spacing.xs }}>
              {trend.data.delta > 0 ? "+" : ""}
              {trend.data.delta.toFixed(2)}
            </Text>
          ) : null}
          {trend.data.series && trend.data.series.length > 0 ? (
            <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
              {trend.data.series.slice(-7).map((p) => (
                <View key={p.date} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.textMuted }}>{p.date}</Text>
                  <Text style={{ color: colors.text }}>{p.value}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title={t("reports.noData")} />
          )}
        </Card>
      )}
    </ScreenScroll>
  );
}
