import React, { useMemo, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PillGroup } from "@/components/ui/PillGroup";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";
import { useToast } from "@/components/ui/Toast";
import {
  comparePeriods,
  createHealthMetric,
  fetchAggregated,
  listHealthMetrics,
  type AggregatePeriod,
  type MetricType,
  type MetricPeriod,
} from "@/api/endpoints/health-metrics";
import { ApiError } from "@/api/errors";
import { formatDate } from "@/utils/date";

/**
 * Maps the user-facing date range to the backend's aggregation granularity.
 * 7d/30d → daily; 90d → weekly so the chart doesn't render 90 noisy points.
 */
const RANGE_TO_GRANULARITY: Record<MetricPeriod, AggregatePeriod> = {
  "7d": "daily",
  "30d": "daily",
  "90d": "weekly",
};

const RANGE_TO_DAYS: Record<MetricPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function rangeBounds(range: MetricPeriod): { date_from: string; date_to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const fromMs = now.getTime() - RANGE_TO_DAYS[range] * 86_400_000;
  const from = new Date(fromMs).toISOString().slice(0, 10);
  return { date_from: from, date_to: to };
}

const UNITS: Record<MetricType, string> = {
  heart_rate: "bpm",
  steps: "steps",
  sleep_minutes: "min",
  weight_kg: "kg",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
};

const PERIODS: MetricPeriod[] = ["7d", "30d", "90d"];

export default function MetricDetailScreen() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, spacing, fontWeights, typography } = useTheme();
  const params = useLocalSearchParams<{ type: MetricType }>();
  const metric = (params.type ?? "heart_rate") as MetricType;
  const unit = UNITS[metric];

  const [period, setPeriod] = useState<MetricPeriod>("7d");
  const [valueDraft, setValueDraft] = useState("");

  const list = useInfiniteQuery({
    queryKey: ["health-metrics", metric],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listHealthMetrics({ metric_type: metric, page: pageParam, per_page: 25 }),
    getNextPageParam: (last) => {
      const { page, per_page, total } = last.meta;
      return page * per_page < total ? page + 1 : undefined;
    },
  });

  const aggregated = useQuery({
    queryKey: ["health-metrics", "aggregated", metric, period],
    queryFn: () => {
      const bounds = rangeBounds(period);
      return fetchAggregated({
        metric_type: metric,
        period: RANGE_TO_GRANULARITY[period],
        ...bounds,
      });
    },
  });

  const compared = useQuery({
    queryKey: ["health-metrics", "compare-periods", metric, period],
    queryFn: () => comparePeriods({ metric, period }),
  });

  const create = useMutation({
    mutationFn: () =>
      createHealthMetric({
        metric_type: metric,
        value: Number(valueDraft),
        unit,
        recorded_at: new Date().toISOString(),
      }),
    onSuccess() {
      setValueDraft("");
      qc.invalidateQueries({ queryKey: ["health-metrics", metric] });
      qc.invalidateQueries({ queryKey: ["health-metrics", "aggregated", metric] });
      qc.invalidateQueries({ queryKey: ["health-metrics", "compare-periods", metric] });
      toast.success(t("health.metricSaved"));
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : t("healthMetrics.couldNotSave"));
    },
  });

  // Memoized so unrelated re-renders (e.g. period flip, toast tick)
  // don't re-allocate the full history array.
  const allRows = useMemo(
    () => list.data?.pages.flatMap((p) => p.data) ?? [],
    [list.data]
  );

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={list.isFetching || aggregated.isFetching}
          onRefresh={() => {
            list.refetch();
            aggregated.refetch();
            compared.refetch();
          }}
          tintColor={colors.brand}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader
        title={metric.replace(/_/g, " ")}
        subtitle={t("healthMetrics.unitLabel", { unit })}
      />

      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.lg.fontSize,
            marginBottom: spacing.sm,
          }}
        >
          {t("health.addMetric")}
        </Text>
        <Input
          value={valueDraft}
          onChangeText={setValueDraft}
          keyboardType="decimal-pad"
          placeholder={t("healthMetrics.valueLabel", { unit })}
        />
        <View style={{ marginTop: spacing.sm }}>
          <Button
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!valueDraft || Number.isNaN(Number(valueDraft))}
            fullWidth
          >
            {t("common.save")}
          </Button>
        </View>
      </Card>

      <Card>
        <PillGroup<MetricPeriod>
          accessibilityLabel="Period"
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((p) => ({ value: p, label: p }))}
          style={{ marginBottom: spacing.md }}
        />
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.base.fontSize,
            marginBottom: spacing.xs,
          }}
        >
          {t("healthMetrics.periodComparison")}
        </Text>
        {compared.isPending ? (
          <LoadingState />
        ) : compared.isError ? (
          <ErrorState error={compared.error} onRetry={() => compared.refetch()} />
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                {t("healthMetrics.currentAvg")}
              </Text>
              <Text style={{ color: colors.text, fontWeight: fontWeights.bold, fontSize: typography.xl.fontSize }}>
                {compared.data?.current?.avg_value != null
                  ? compared.data.current.avg_value.toFixed(1)
                  : "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                {t("healthMetrics.previousAvg")}
              </Text>
              <Text style={{ color: colors.text, fontWeight: fontWeights.bold, fontSize: typography.xl.fontSize }}>
                {compared.data?.previous?.avg_value != null
                  ? compared.data.previous.avg_value.toFixed(1)
                  : "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                {t("healthMetrics.deltaPct")}
              </Text>
              <Text style={{ color: colors.brand, fontWeight: fontWeights.bold, fontSize: typography.xl.fontSize }}>
                {compared.data?.change_percent != null
                  ? `${compared.data.change_percent.toFixed(1)}%`
                  : "—"}
              </Text>
            </View>
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
          {t("healthMetrics.history")}
        </Text>
        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : allRows.length === 0 ? (
          <EmptyState title={t("health.noMetrics")} />
        ) : (
          <View style={{ gap: spacing.xs }}>
            {allRows.map((row) => (
              <View
                key={row.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textMuted }}>
                  {formatDate(row.recorded_at, "MMM D, HH:mm")}
                </Text>
                <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
                  {row.value} {row.unit}
                </Text>
              </View>
            ))}
            {list.hasNextPage ? (
              <Button
                onPress={() => list.fetchNextPage()}
                loading={list.isFetchingNextPage}
                variant="ghost"
                fullWidth
              >
                {t("healthMetrics.loadMore")}
              </Button>
            ) : null}
          </View>
        )}
      </Card>
    </ScreenScroll>
  );
}
