import React, { memo } from "react";
import { RefreshControl, Text, View } from "react-native";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  listAppointments,
  updateAppointmentStatus,
  type AppointmentStatusTarget,
  type Appointment,
} from "@/api/endpoints/appointments";
import { ApiError } from "@/api/errors";
import { formatDate } from "@/utils/date";

export default function AppointmentsScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, typography, spacing } = useTheme();

  const list = useInfiniteQuery({
    queryKey: ["appointments"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listAppointments({ page: pageParam, per_page: 25 }),
    getNextPageParam: (last) => {
      const { page, per_page, total } = last.meta;
      return page * per_page < total ? page + 1 : undefined;
    },
  });

  const updateStatus = useMutation({
    mutationFn: (vars: { id: string; status: AppointmentStatusTarget }) =>
      updateAppointmentStatus(vars.id, vars.status),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(t("common.saved"));
    },
    onError(err) {
      if (err instanceof ApiError && err.code === "INVALID_STATUS_TRANSITION") {
        toast.error(t("appointments.invalidStatusChange"));
      } else {
        toast.error(err instanceof ApiError ? err.message : t("appointmentsForm.couldNotCreate"));
      }
    },
  });

  const allRows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const upcoming = allRows.filter((a) => a.status === "upcoming");
  const past = allRows.filter((a) => a.status !== "upcoming");

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={list.isFetching && !list.isFetchingNextPage}
          onRefresh={() => list.refetch()}
          tintColor={colors.brand}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader
        title={t("appointments.title")}
        action={
          <Button
            size="sm"
            onPress={() => router.push("/(tabs)/more/appointments/add")}
          >
            {t("appointments.addAppointment")}
          </Button>
        }
      />


      {list.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : list.isError ? (
        <Card>
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        </Card>
      ) : allRows.length === 0 ? (
        <EmptyState
          title={t("appointments.noAppointments")}
          action={
            <Button onPress={() => router.push("/(tabs)/more/appointments/add")}>
              {t("appointments.addAppointment")}
            </Button>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: fontWeights.semibold,
                  fontSize: typography.lg.fontSize,
                  paddingHorizontal: spacing.xs,
                }}
              >
                {t("appointments.upcomingHeader")}
              </Text>
              <View style={{ gap: spacing.md }}>
                {upcoming.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    onCancel={() =>
                      updateStatus.mutate({ id: a.id, status: "cancelled" })
                    }
                    onComplete={() =>
                      updateStatus.mutate({ id: a.id, status: "completed" })
                    }
                    pendingId={
                      updateStatus.isPending ? updateStatus.variables?.id ?? null : null
                    }
                  />
                ))}
              </View>
            </>
          ) : null}
          {past.length > 0 ? (
            <>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: fontWeights.semibold,
                  fontSize: typography.lg.fontSize,
                  paddingHorizontal: spacing.xs,
                  marginTop: spacing.md,
                }}
              >
                {t("appointments.pastHeader")}
              </Text>
              <View style={{ gap: spacing.md }}>
                {past.map((a) => (
                  <AppointmentCard key={a.id} appt={a} />
                ))}
              </View>
            </>
          ) : null}
          {list.hasNextPage ? (
            <Button
              onPress={() => list.fetchNextPage()}
              loading={list.isFetchingNextPage}
              variant="ghost"
              fullWidth
            >
              {t("appointmentsForm.loadMore")}
            </Button>
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}

interface AppointmentCardProps {
  appt: Appointment;
  onCancel?: () => void;
  onComplete?: () => void;
  pendingId?: string | null;
}

const AppointmentCard = memo(AppointmentCardImpl);

function AppointmentCardImpl({
  appt,
  onCancel,
  onComplete,
  pendingId,
}: AppointmentCardProps) {
  const t = useT();
  const { colors, spacing, fontWeights, typography } = useTheme();
  const isPending = pendingId === appt.id;
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.base.fontSize,
          }}
        >
          {appt.doctor_name}
        </Text>
        <Badge tone={appt.status === "upcoming" ? "info" : appt.status === "cancelled" ? "danger" : "success"}>
          {appt.status}
        </Badge>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, marginTop: 4 }}>
        {formatDate(appt.appointment_date, "MMM D, YYYY · HH:mm")}
      </Text>
      {appt.specialty || appt.clinic ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, marginTop: 2 }}>
          {[appt.specialty, appt.clinic].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
      {appt.diagnosis ? (
        <Text style={{ color: colors.text, marginTop: spacing.sm }}>{appt.diagnosis}</Text>
      ) : null}
      {appt.notes ? (
        <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, marginTop: spacing.xs }}>
          {appt.notes}
        </Text>
      ) : null}
      {appt.status === "upcoming" && (onCancel || onComplete) ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          {onComplete ? (
            <Button size="sm" onPress={onComplete} loading={isPending} variant="secondary">
              {t("appointments.markComplete")}
            </Button>
          ) : null}
          {onCancel ? (
            <Button size="sm" onPress={onCancel} loading={isPending} variant="ghost">
              {t("common.cancel")}
            </Button>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
