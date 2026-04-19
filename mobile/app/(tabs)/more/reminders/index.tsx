import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentGroup } from "@/components/ui/SegmentGroup";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  deleteReminder,
  fetchReminderOccurrences,
  fetchReminders,
  markOccurrenceDone,
  skipReminder,
  snoozeReminder,
  updateReminderDone,
} from "@/api/endpoints/reminders";
import { cancelReminder, reconcileReminders } from "@/notifications/scheduler";
import { ApiError } from "@/api/errors";
import { formatDate, formatTime } from "@/utils/date";

type Tab = "today" | "all";

export default function RemindersScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, typography, spacing } = useTheme();
  const [tab, setTab] = useState<Tab>("today");

  const reminders = useQuery({
    queryKey: ["reminders"],
    queryFn: () => fetchReminders(),
    enabled: tab === "all",
  });

  const occurrences = useQuery({
    queryKey: ["reminders", "occurrences", "today"],
    queryFn: () => fetchReminderOccurrences({ today: true }),
    enabled: tab === "today",
  });

  useEffect(() => {
    if (reminders.data) {
      reconcileReminders(reminders.data).catch(() => undefined);
    }
  }, [reminders.data]);

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateReminderDone(id, done),
    onSuccess(updated) {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders", "upcoming"] });
      qc.invalidateQueries({ queryKey: ["reminders", "occurrences", "today"] });
      if (updated.done) {
        cancelReminder(updated.id).catch(() => undefined);
      }
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess(_data, id) {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders", "upcoming"] });
      qc.invalidateQueries({ queryKey: ["reminders", "occurrences", "today"] });
      cancelReminder(id).catch(() => undefined);
    },
    onError() {
      toast.error("Couldn't delete reminder.");
    },
  });

  const occurrenceDone = useMutation({
    mutationFn: (vars: { reminderId: string; occurrenceId?: string }) =>
      markOccurrenceDone(vars.reminderId, vars.occurrenceId),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["reminders", "occurrences", "today"] });
      qc.invalidateQueries({ queryKey: ["reminders", "upcoming"] });
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't mark done.");
    },
  });

  const occurrenceSkip = useMutation({
    mutationFn: (vars: { reminderId: string; occurrenceId?: string }) =>
      skipReminder(vars.reminderId, vars.occurrenceId),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["reminders", "occurrences", "today"] });
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't skip.");
    },
  });

  const occurrenceSnooze = useMutation({
    mutationFn: (vars: { reminderId: string; occurrenceId?: string; minutes: number }) =>
      snoozeReminder(vars.reminderId, {
        minutes: vars.minutes,
        occurrence_id: vars.occurrenceId,
      }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["reminders", "occurrences", "today"] });
      toast.success(t("common.saved"));
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't snooze.");
    },
  });

  const refreshing =
    tab === "today" ? occurrences.isFetching : reminders.isFetching;
  const onRefresh = () => {
    if (tab === "today") occurrences.refetch();
    else reminders.refetch();
  };

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader
        title={t("reminders.title")}
        action={
          <Button
            size="sm"
            onPress={() => router.push("/(tabs)/more/reminders/add")}
          >
            {t("reminders.addReminder")}
          </Button>
        }
      />

      <View style={{ paddingHorizontal: spacing.base }}>
        <SegmentGroup<Tab>
          accessibilityLabel={t("reminders.title")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "today", label: t("reminders.upcoming") },
            { value: "all", label: t("reminders.all") },
          ]}
        />
      </View>

      {tab === "today" ? (
        occurrences.isPending ? (
          <Card>
            <LoadingState />
          </Card>
        ) : occurrences.isError ? (
          <Card>
            <ErrorState
              error={occurrences.error}
              onRetry={() => occurrences.refetch()}
            />
          </Card>
        ) : occurrences.data.length === 0 ? (
          <EmptyState
            title={t("reminders.noReminders")}
            action={
              <Button onPress={() => router.push("/(tabs)/more/reminders/add")}>
                {t("reminders.addReminder")}
              </Button>
            }
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {occurrences.data.map((occ) => (
              <Card key={occ.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
                      {occ.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}>
                      {formatDate(occ.scheduled_at, "MMM D, HH:mm")} ·{" "}
                      {occ.snoozed_until
                        ? `snoozed → ${formatTime(occ.snoozed_until)}`
                        : occ.status}
                    </Text>
                  </View>
                  <Badge tone={occ.status === "done" ? "success" : occ.status === "skipped" ? "neutral" : "info"}>
                    {occ.status}
                  </Badge>
                </View>
                {occ.status === "pending" || occ.status === "snoozed" ? (
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" }}>
                    <Button
                      size="sm"
                      onPress={() =>
                        occurrenceDone.mutate({ reminderId: occ.reminder_id, occurrenceId: occ.id })
                      }
                      loading={
                        occurrenceDone.isPending && occurrenceDone.variables?.occurrenceId === occ.id
                      }
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        occurrenceSnooze.mutate({
                          reminderId: occ.reminder_id,
                          occurrenceId: occ.id,
                          minutes: 10,
                        })
                      }
                      loading={
                        occurrenceSnooze.isPending && occurrenceSnooze.variables?.occurrenceId === occ.id
                      }
                    >
                      Snooze 10m
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        occurrenceSkip.mutate({
                          reminderId: occ.reminder_id,
                          occurrenceId: occ.id,
                        })
                      }
                      loading={
                        occurrenceSkip.isPending && occurrenceSkip.variables?.occurrenceId === occ.id
                      }
                    >
                      Skip
                    </Button>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        )
      ) : reminders.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : reminders.isError ? (
        <Card>
          <ErrorState error={reminders.error} onRetry={() => reminders.refetch()} />
        </Card>
      ) : reminders.data.length === 0 ? (
        <EmptyState
          title={t("reminders.noReminders")}
          action={
            <Button onPress={() => router.push("/(tabs)/more/reminders/add")}>
              {t("reminders.addReminder")}
            </Button>
          }
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {reminders.data.map((r) => (
            <Card key={r.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: fontWeights.semibold,
                      fontSize: typography.base.fontSize,
                      textDecorationLine: r.done ? "line-through" : "none",
                    }}
                  >
                    {r.title}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, marginTop: 2 }}>
                    {r.time} · {r.repeat}
                  </Text>
                  {r.note ? (
                    <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 4 }}>
                      {r.note}
                    </Text>
                  ) : null}
                </View>
                <Badge tone="neutral">{r.type}</Badge>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                <Pressable
                  onPress={() => toggleDone.mutate({ id: r.id, done: !r.done })}
                  // 44dp tap target via minHeight; the visible padding
                  // stays compact so the row doesn't grow taller.
                  accessibilityRole="button"
                  accessibilityLabel={
                    r.done ? t("reminders.markIncomplete") : t("reminders.markDone")
                  }
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>
                    {r.done ? t("reminders.markIncomplete") : t("reminders.markDone")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => remove.mutate(r.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("common.delete")} ${r.title}`}
                  accessibilityHint="Removes this reminder"
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: colors.danger, fontWeight: fontWeights.semibold }}>
                    {t("common.delete")}
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}
