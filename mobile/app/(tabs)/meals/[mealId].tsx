import React from "react";
import { Image, RefreshControl, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { getMeal, type MealResponse } from "@/api/endpoints/meals";
import { formatDate } from "@/utils/date";

export default function MealDetailScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ mealId: string }>();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  const mealId = params.mealId ?? "";

  const meal = useQuery({
    queryKey: ["meal", mealId],
    enabled: !!mealId,
    queryFn: () => getMeal(mealId),
    refetchInterval: (query) => {
      const data = query.state.data as MealResponse | undefined;
      return data && data.status !== "analyzed" && data.status !== "failed"
        ? 3000
        : false;
    },
  });

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={meal.isFetching}
          onRefresh={() => meal.refetch()}
          tintColor={colors.brand}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={meal.data?.name ?? t("meals.fallbackTitle")} />

      {meal.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : meal.isError ? (
        <Card>
          <ErrorState error={meal.error} onRetry={() => meal.refetch()} />
        </Card>
      ) : (
        <>
          <Card>
            {meal.data.image_url ? (
              <Image
                source={{ uri: meal.data.image_url }}
                style={{ width: "100%", height: 220, borderRadius: radius.md }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md, gap: spacing.sm }}>
              <Badge tone={meal.data.status === "analyzed" ? "success" : meal.data.status === "failed" ? "danger" : "info"}>
                {meal.data.status}
              </Badge>
              <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>
                {t("meals.loggedAt", { when: formatDate(meal.data.logged_at, "MMM D, HH:mm") })}
              </Text>
            </View>
            {meal.data.notes ? (
              <Text style={{ color: colors.text, marginTop: spacing.sm }}>{meal.data.notes}</Text>
            ) : null}
          </Card>

          {meal.data.nutrition_result ? (
            <Card>
              <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, fontSize: typography.lg.fontSize, marginBottom: spacing.sm }}>
                {t("meals.nutrition")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
                <Stat label={t("meals.calories")} value={meal.data.nutrition_result.calories} unit="kcal" />
                <Stat label={t("meals.protein")} value={meal.data.nutrition_result.protein_g} unit="g" />
                <Stat label={t("meals.carbs")} value={meal.data.nutrition_result.carbs_g} unit="g" />
                <Stat label={t("meals.fat")} value={meal.data.nutrition_result.fat_g} unit="g" />
              </View>
              {meal.data.nutrition_result.items && meal.data.nutrition_result.items.length > 0 ? (
                <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                  {meal.data.nutrition_result.items.map((item, idx) => (
                    <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: colors.text }}>{item.name}</Text>
                      <Text style={{ color: colors.textMuted }}>
                        {item.calories ? `${Math.round(item.calories)} kcal` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : meal.data.status !== "failed" ? (
            <Card>
              <Text style={{ color: colors.textMuted }}>{t("meals.analyzing")}</Text>
            </Card>
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}

function Stat({ label, value, unit }: { label: string; value?: number; unit: string }) {
  const { colors, spacing, fontWeights, typography, radius } = useTheme();
  return (
    <View
      style={{
        flexBasis: "47%",
        padding: spacing.md,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: fontWeights.bold, fontSize: typography.xl.fontSize, marginTop: 2 }}>
        {value !== undefined && value !== null ? `${Math.round(value)} ${unit}` : "—"}
      </Text>
    </View>
  );
}
