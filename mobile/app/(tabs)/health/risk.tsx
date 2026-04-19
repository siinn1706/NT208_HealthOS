import React from "react";
import { RefreshControl, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";
import { fetchRiskSummary } from "@/api/endpoints/health-insights";
import { relative } from "@/utils/date";

export default function RiskScreen() {
  const t = useT();
  const { colors, fontWeights, typography, spacing } = useTheme();
  const risk = useQuery({
    queryKey: ["risk-predictions"],
    queryFn: fetchRiskSummary,
  });

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl refreshing={risk.isFetching} onRefresh={() => risk.refetch()} tintColor={colors.brand} />
      }
    >
      <PageHeader title={t("health.risk")} />

      {risk.isPending ? (
        <LoadingState />
      ) : risk.isError ? (
        <ErrorState error={risk.error} onRetry={() => risk.refetch()} />
      ) : (
        <>
          <Card>
            <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
              Generated {relative(risk.data.generatedAt)}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontWeight: fontWeights.bold,
                fontSize: typography["3xl"].fontSize,
                marginTop: spacing.xs,
              }}
            >
              {risk.data.overallScore ?? "—"}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
              Overall risk score
            </Text>
          </Card>

          {risk.data.risks && risk.data.risks.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              {risk.data.risks.map((r, i) => (
                <Card key={r.id ?? i}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, flex: 1 }}>
                      {r.name}
                    </Text>
                    <Badge tone={r.severity === "high" ? "danger" : r.severity === "moderate" ? "warning" : "success"}>
                      {r.severity ?? "low"}
                    </Badge>
                  </View>
                  {r.recommendation ? (
                    <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>{r.recommendation}</Text>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title={t("common.emptyTitle")} />
          )}

          {risk.data.disclaimer ? (
            <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: spacing.md }}>
              {risk.data.disclaimer}
            </Text>
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}
