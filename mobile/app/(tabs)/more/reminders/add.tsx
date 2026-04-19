import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  DateTimeField,
  dateToHHmm,
  hhmmToToday,
} from "@/components/ui/DateTimeField";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  createReminder,
  type ReminderRepeat,
  type ReminderType,
} from "@/api/endpoints/reminders";
import {
  ensureNotificationPermission,
  configureForegroundHandler,
} from "@/notifications/permissions";
import { scheduleReminder } from "@/notifications/scheduler";
import { ApiError } from "@/api/errors";

const TYPES: { value: ReminderType; key: string }[] = [
  { value: "medicine", key: "reminders.medicine" },
  { value: "appointment", key: "reminders.appointment" },
  { value: "exercise", key: "reminders.exercise" },
];

const REPEATS: { value: ReminderRepeat; key: string }[] = [
  { value: "once", key: "reminders.once" },
  { value: "daily", key: "reminders.daily" },
  { value: "weekly", key: "reminders.weekly" },
  { value: "monthly", key: "reminders.monthly" },
];

export default function AddReminderScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  const [type, setType] = useState<ReminderType>("medicine");
  const [title, setTitle] = useState("");
  const [timeDate, setTimeDate] = useState<Date | null>(() => hhmmToToday("08:00"));
  const [repeat, setRepeat] = useState<ReminderRepeat>("daily");
  const [note, setNote] = useState("");

  const time = dateToHHmm(timeDate);

  const create = useMutation({
    mutationFn: () =>
      createReminder({
        type,
        title: title.trim(),
        time,
        repeat,
        note: note.trim() || undefined,
      }),
    async onSuccess(reminder) {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders", "upcoming"] });
      const granted = await ensureNotificationPermission();
      if (granted) {
        configureForegroundHandler();
        await scheduleReminder(reminder).catch(() => undefined);
        toast.success(t("reminders.scheduledLocally"));
      } else {
        toast.info(t("reminders.permissionRequired"));
      }
      router.back();
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create reminder.");
    },
  });

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("reminders.addReminder")} />
      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            marginBottom: spacing.sm,
          }}
        >
          {t("reminders.type")}
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          {TYPES.map((opt) => {
            const active = type === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
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

      <Card>
        <View style={{ gap: spacing.md }}>
          <Input
            label={t("reminders.name")}
            value={title}
            onChangeText={setTitle}
          />
          <DateTimeField
            label={t("reminders.time")}
            mode="time"
            value={timeDate}
            onChange={setTimeDate}
          />

          <View>
            <Text
              style={{
                color: colors.text,
                fontWeight: fontWeights.semibold,
                marginBottom: spacing.sm,
              }}
            >
              {t("reminders.repeat")}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              {REPEATS.map((opt) => {
                const active = repeat === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRepeat(opt.value)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
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
          </View>

          <Input
            label={t("reminders.note")}
            value={note}
            onChangeText={setNote}
            multiline
          />

          <Button
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!title.trim() || !time}
            fullWidth
          >
            {t("common.create")}
          </Button>
        </View>
      </Card>
    </ScreenScroll>
  );
}
