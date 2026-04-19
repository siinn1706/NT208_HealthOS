import React, { useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { fetchReport, type ReportPeriod } from "@/api/endpoints/reports";

const PERIODS: { value: ReportPeriod; key: string }[] = [
  { value: "7d", key: "reports.rangeWeek" },
  { value: "30d", key: "reports.rangeMonth" },
  { value: "90d", key: "reports.rangeQuarter" },
];

export default function ReportsScreen() {
  const t = useT();
  const router = useRouter();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>("7d");

  const report = useQuery({
    queryKey: ["report", period],
    queryFn: () => fetchReport(period),
  });

  const sections = (report.data?.sections ?? []) as Array<{
    title?: string;
    body?: string;
    metric?: string;
  }>;

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={report.isFetching}
          onRefresh={() => report.refetch()}
          tintColor={colors.brand}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader
        title={t("reports.title")}
        action={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => router.push("/(tabs)/more/reports/trends")}
            >
              {t("reports.trends")}
            </Button>
            <Button
              size="sm"
              onPress={() => router.push("/(tabs)/more/reports/export")}
            >
              PDF
            </Button>
          </View>
        }
      />

      <Card>
        <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          {PERIODS.map((opt) => {
            const active = period === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPeriod(opt.value)}
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
                  {t(opt.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {report.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : report.isError ? (
        <Card>
          <ErrorState error={report.error} onRetry={() => report.refetch()} />
        </Card>
      ) : sections.length === 0 ? (
        <EmptyState title={t("reports.noData")} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {report.data?.summary ? (
            <Card>
              <Text style={{ color: colors.text }}>{report.data.summary}</Text>
            </Card>
          ) : null}
          {sections.map((sec, idx) => (
            <Card key={idx}>
              {sec.title ? (
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: fontWeights.semibold,
                    fontSize: typography.lg.fontSize,
                    marginBottom: spacing.xs,
                  }}
                >
                  {sec.title}
                </Text>
              ) : null}
              {sec.body ? (
                <Text style={{ color: colors.textMuted }}>{sec.body}</Text>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}
