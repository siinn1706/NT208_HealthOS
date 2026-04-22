import React, { memo, useCallback, useMemo } from "react";
import { Image, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import {
  fetchCaloriesSummary,
  listMeals,
  type MealResponse,
} from "@/api/endpoints/meals";
import { ApiError } from "@/api/errors";
import { formatTime, todayBounds } from "@/utils/date";
import { spacing, tabBarFrameHeight } from "@/theme/tokens";

// Hoisted style constants — reuse the same object across every list
// row instead of allocating fresh ones per render. spacing.base = 16,
// spacing.md = 12 (matches the previous inline magic numbers).
const ROW_WRAP = { paddingHorizontal: spacing.base, paddingBottom: spacing.md };
const EMPTY_PAD = { padding: spacing.base };

/**
 * Meals list is the most likely-to-grow page in the app — a power user can
 * accumulate hundreds of entries. Render it through `FlashList` (already in
 * deps) so off-screen rows recycle and scrolling stays smooth as the
 * dataset grows. The KPI summary and quick actions ride above as a
 * `ListHeaderComponent`.
 */
export default function MealsScreen() {
  const t = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const listBottomPad = tabBarFrameHeight() + spacing.base + insets.bottom;

  const list = useInfiniteQuery({
    queryKey: ["meals"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listMeals({ page: pageParam, per_page: 25 }),
    getNextPageParam: (last) => {
      const { page, per_page, total } = last.meta;
      return page * per_page < total ? page + 1 : undefined;
    },
  });

  const calories = useQuery({
    queryKey: ["meals", "calories-summary", "today"],
    queryFn: async () => {
      const today = todayBounds();
      try {
        return await fetchCaloriesSummary({
          date_from: today.start,
          date_to: today.end,
        });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 422 || err.status === 500)) {
          const recent = await listMeals({
            per_page: 50,
            date_from: today.start,
            date_to: today.end,
          });
          const total = recent.data.reduce(
            (sum, meal) => sum + (meal.nutrition_result?.calories ?? 0),
            0
          );
          return [{ date: today.start.slice(0, 10), total_calories: total }];
        }
        throw err;
      }
    },
    refetchInterval: 15 * 60_000,
    retry: false,
  });

  // Memoize the flattened list so FlashList's `data` prop reference is
  // stable across re-renders triggered by anything other than a real
  // pagination/refetch. Without this, every parent render recomputes
  // the whole array and FlashList re-runs layout for every cell.
  const allMeals = useMemo(
    () => list.data?.pages.flatMap((p) => p.data) ?? [],
    [list.data]
  );
  const todayCalories = calories.data?.[0]?.total_calories ?? 0;

  const renderItem = useCallback<ListRenderItem<MealResponse>>(
    ({ item }) => (
      <View style={ROW_WRAP}>
        <MealRow
          meal={item}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/meals/[mealId]",
              params: { mealId: item.id },
            })
          }
        />
      </View>
    ),
    [router]
  );

  const keyExtractor = useCallback((item: MealResponse) => item.id, []);

  const onEndReached = useCallback(() => {
    if (list.hasNextPage && !list.isFetchingNextPage) {
      list.fetchNextPage();
    }
  }, [list]);

  return (
    <ScreenContainer edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlashList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: listBottomPad }}
        data={allMeals}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={104}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching && !list.isFetchingNextPage}
            onRefresh={() => {
              list.refetch();
              calories.refetch();
            }}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <Header
            todayCalories={todayCalories}
            onSnap={() => router.push("/(tabs)/meals/snap")}
            onAdd={() => router.push("/(tabs)/meals/add")}
          />
        }
        ListEmptyComponent={
          list.isPending ? (
            <View style={EMPTY_PAD}>
              <Card>
                <LoadingState />
              </Card>
            </View>
          ) : list.isError ? (
            <View style={EMPTY_PAD}>
              <Card>
                <ErrorState error={list.error} onRetry={() => list.refetch()} />
              </Card>
            </View>
          ) : (
            <View style={EMPTY_PAD}>
              <EmptyState
                title={t("meals.noMeals")}
                action={
                  <Button onPress={() => router.push("/(tabs)/meals/snap")}>
                    {t("meals.snap")}
                  </Button>
                }
              />
            </View>
          )
        }
        ListFooterComponent={
          list.hasNextPage ? (
            <View style={EMPTY_PAD}>
              <Button
                onPress={() => list.fetchNextPage()}
                loading={list.isFetchingNextPage}
                variant="ghost"
                fullWidth
              >
                {t("meals.loadMore")}
              </Button>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

function HeaderImpl({
  todayCalories,
  onSnap,
  onAdd,
}: {
  todayCalories: number;
  onSnap: () => void;
  onAdd: () => void;
}) {
  const t = useT();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  return (
    <View style={{ padding: spacing.base, gap: spacing.base }}>
      <PageHeader title={t("meals.title")} />
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
          {t("meals.calories")} · {t("common.today").toLowerCase()}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: typography["3xl"].fontSize,
            fontWeight: fontWeights.bold,
            marginTop: spacing.xs,
          }}
        >
          {Math.round(todayCalories)}
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            onPress={onSnap}
            accessibilityRole="button"
            accessibilityLabel={t("meals.snap")}
            style={{
              flex: 1,
              backgroundColor: colors.brand,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.brandText, fontWeight: fontWeights.semibold }}>
              {t("meals.snap")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={t("meals.addMeal")}
            style={{
              flex: 1,
              backgroundColor: colors.surfaceMuted,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
              {t("meals.addMeal")}
            </Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}
const Header = memo(HeaderImpl);

interface MealRowProps {
  meal: MealResponse;
  onPress: () => void;
}

function MealRowImpl({ meal, onPress }: MealRowProps) {
  const { colors, spacing, fontWeights, typography, radius } = useTheme();
  const initial = (meal.name?.[0] ?? "?").toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meal.name}
    >
      <Card>
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          {meal.image_url ? (
            <Image
              source={{ uri: meal.image_url }}
              style={{ width: 56, height: 56, borderRadius: radius.md }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceMuted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.textMuted }}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>{meal.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}>
              {formatTime(meal.logged_at)} ·{" "}
              {meal.nutrition_result?.calories
                ? `${Math.round(meal.nutrition_result.calories)} kcal`
                : "—"}
            </Text>
          </View>
          <Badge
            tone={
              meal.status === "analyzed"
                ? "success"
                : meal.status === "failed"
                  ? "danger"
                  : "info"
            }
          >
            {meal.status}
          </Badge>
        </View>
      </Card>
    </Pressable>
  );
}

const MealRow = memo(MealRowImpl, (prev, next) => prev.meal === next.meal);
