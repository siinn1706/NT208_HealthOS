import React, { useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { VitalsLineChart } from "@/components/charts/VitalsLineChart";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { fetchVitalsTimeseries } from "@/api/endpoints/vitals";
import { fetchHealthGoal } from "@/api/endpoints/health-goals";

const RANGES = [
  { value: 7, key: "health.rangeShort" },
  { value: 30, key: "health.rangeMonth" },
  { value: 90, key: "health.rangeQuarter" },
] as const;

export default function HealthScreen() {
  const t = useT();
  const router = useRouter();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  const [days, setDays] = useState<7 | 30 | 90>(7);

  const vitals = useQuery({
    queryKey: ["vitals", days],
    queryFn: () => fetchVitalsTimeseries(days),
  });

  const goal = useQuery({
    queryKey: ["health-goal"],
    queryFn: fetchHealthGoal,
  });

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={vitals.isFetching || goal.isFetching}
          onRefresh={() => {
            vitals.refetch();
            goal.refetch();
          }}
          tintColor={colors.brand}
        />
      }
    >
      <PageHeader
        title={t("health.title")}
        action={
          <Button
            size="sm"
            variant="secondary"
            onPress={() => router.push("/(tabs)/health/risk")}
          >
            {t("health.risk")}
          </Button>
        }
      />

      <Card>
        <View style={{ flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md }}>
          {RANGES.map((r) => {
            const active = days === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setDays(r.value as 7 | 30 | 90)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.brand : colors.surfaceMuted,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.brandText : colors.text,
                    fontWeight: fontWeights.semibold,
                    fontSize: typography.xs.fontSize,
                  }}
                >
                  {t(r.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginBottom: 4 }}>
          {t("healthMetrics.heartRate")}
        </Text>
        {vitals.isPending ? (
          <LoadingState />
        ) : vitals.isError ? (
          <ErrorState error={vitals.error} onRetry={() => vitals.refetch()} />
        ) : (
          <VitalsLineChart data={vitals.data} metric="heart_rate" />
        )}

        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: spacing.md, marginBottom: 4 }}>
          {t("healthMetrics.bloodPressureSystolic")}
        </Text>
        {vitals.isPending ? null : vitals.isError ? null : (
          <VitalsLineChart data={vitals.data} metric="systolic" />
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
          {t("health.metrics")}
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          <Button onPress={() => router.push("/(tabs)/health/metrics/heart_rate")} variant="secondary">
            {t("healthMetrics.heartRate")}
          </Button>
          <Button onPress={() => router.push("/(tabs)/health/metrics/weight_kg")} variant="secondary">
            {t("healthMetrics.weight")}
          </Button>
          <Button onPress={() => router.push("/(tabs)/health/metrics/steps")} variant="secondary">
            {t("healthMetrics.steps")}
          </Button>
          <Button onPress={() => router.push("/(tabs)/health/metrics/sleep_minutes")} variant="secondary">
            {t("healthMetrics.sleep")}
          </Button>
        </View>
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
          {t("health.goal")}
        </Text>
        {goal.isPending ? (
          <LoadingState />
        ) : goal.isError ? (
          <ErrorState error={goal.error} onRetry={() => goal.refetch()} />
        ) : !goal.data ? (
          <Button onPress={() => router.push("/(tabs)/health/goal")} fullWidth>
            Set a goal
          </Button>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text }}>
              Target weight: {goal.data.target_weight_kg ?? "—"} kg
            </Text>
            <Text style={{ color: colors.textMuted }}>
              Deadline: {goal.data.deadline ?? "—"}
            </Text>
            <Button onPress={() => router.push("/(tabs)/health/goal")} variant="secondary">
              {t("common.edit")}
            </Button>
          </View>
        )}
      </Card>
    </ScreenScroll>
  );
}
