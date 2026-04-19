import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useTheme } from "@/theme";
import { useT } from "@/i18n";
import { useToast } from "@/components/ui/Toast";
import {
  createHealthGoal,
  deleteHealthGoal,
  fetchGoalProgress,
  fetchHealthGoal,
  updateHealthGoal,
} from "@/api/endpoints/health-goals";
import { ApiError } from "@/api/errors";

export default function HealthGoalScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, spacing, fontWeights, typography } = useTheme();

  const goal = useQuery({
    queryKey: ["health-goal"],
    queryFn: fetchHealthGoal,
  });

  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState<Date | null>(null);

  useEffect(() => {
    if (goal.data) {
      setTarget(goal.data.target_weight_kg?.toString() ?? "");
      setDeadline(goal.data.deadline ? new Date(goal.data.deadline) : null);
    }
  }, [goal.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        target_weight_kg: target ? Number(target) : undefined,
        deadline: deadline ? deadline.toISOString().slice(0, 10) : undefined,
      };
      if (goal.data) {
        return updateHealthGoal(goal.data.id, payload);
      }
      return createHealthGoal(payload);
    },
    onSuccess(updated) {
      qc.setQueryData(["health-goal"], updated);
      toast.success(t("common.saved"));
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save goal.");
    },
  });

  const remove = useMutation({
    // Take the goal id as a mutation variable instead of reaching back
    // into the query state. Caller passes `goal.data.id` from a render
    // path where it's already narrowed to non-nullable, which gives us
    // type safety without a non-null assertion.
    mutationFn: (id: string) => deleteHealthGoal(id),
    onSuccess() {
      qc.setQueryData(["health-goal"], null);
      toast.success(t("common.saved"));
      router.back();
    },
    onError() {
      toast.error("Couldn't delete goal.");
    },
  });

  const targetNum = Number(target);
  const progress = useQuery({
    queryKey: ["goal-progress", "weight_kg", targetNum, "30d"],
    queryFn: () =>
      fetchGoalProgress({ metric: "weight_kg", target: targetNum, period: "30d" }),
    enabled: !!targetNum && !Number.isNaN(targetNum) && targetNum > 0,
  });

  // Snapshot the goal id once per render so the delete-button click
  // closure doesn't have to re-narrow `goal.data` (TypeScript can't
  // follow the narrow across the lambda boundary, which would otherwise
  // force us back to a `goal.data!.id` non-null assertion).
  const existingGoalId = goal.data?.id ?? null;

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("health.goal")} />

      <Card>
        {goal.isPending ? (
          <LoadingState />
        ) : goal.isError ? (
          <ErrorState error={goal.error} onRetry={() => goal.refetch()} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <Input
              label="Target weight (kg)"
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
            />
            <DateTimeField
              label="Deadline"
              mode="date"
              value={deadline}
              onChange={setDeadline}
              minimumDate={new Date()}
            />
            <Button onPress={() => save.mutate()} loading={save.isPending} fullWidth>
              {t("common.save")}
            </Button>
            {existingGoalId ? (
              <Button
                variant="destructive"
                onPress={() => remove.mutate(existingGoalId)}
                loading={remove.isPending}
                fullWidth
              >
                {t("common.delete")}
              </Button>
            ) : null}
          </View>
        )}
      </Card>

      {progress.data && progress.data.length > 0 ? (
        <Card>
          <Text
            style={{
              color: colors.text,
              fontWeight: fontWeights.semibold,
              fontSize: typography.lg.fontSize,
              marginBottom: spacing.sm,
            }}
          >
            {t("health.goalProgress")}
          </Text>
          {progress.data.map((p) => (
            <View
              key={p.date}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={{ color: colors.textMuted }}>{p.date}</Text>
              <Text style={{ color: colors.text }}>{p.value} → {p.target}</Text>
              <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>
                {p.progress_percent.toFixed(0)}%
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </ScreenScroll>
  );
}
