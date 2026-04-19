import React, { useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  connectDevice,
  disconnectDevice,
  listDevices,
  syncDevice,
  type DeviceProvider,
} from "@/api/endpoints/devices";
import { ApiError } from "@/api/errors";
import { relative } from "@/utils/date";

const PROVIDERS: DeviceProvider[] = [
  "apple_health",
  "google_fit",
  "garmin",
  "fitbit",
];

export default function DevicesScreen() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();
  const [picker, setPicker] = useState(false);

  const devices = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
  });

  const connect = useMutation({
    mutationFn: (provider: DeviceProvider) => connectDevice({ provider }),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["devices"] });
      setPicker(false);
      toast.success(t("common.saved"));
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't connect.");
    },
  });

  const sync = useMutation({
    mutationFn: (id: string) => syncDevice(id),
    onSuccess(updated) {
      qc.setQueryData(["devices"], (cur: unknown) => {
        const list = Array.isArray(cur) ? (cur as ReturnType<typeof listDevices> extends Promise<infer U> ? U : never) : [];
        return list.map((d) => (d.id === updated.id ? updated : d));
      });
      toast.success(t("common.saved"));
    },
    onError() {
      toast.error("Couldn't sync.");
    },
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectDevice(id),
    onSuccess(_data, id) {
      qc.setQueryData(["devices"], (cur: unknown) => {
        const list = Array.isArray(cur) ? (cur as ReturnType<typeof listDevices> extends Promise<infer U> ? U : never) : [];
        return list.filter((d) => d.id !== id);
      });
    },
    onError() {
      toast.error("Couldn't disconnect.");
    },
  });

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl
          refreshing={devices.isFetching}
          onRefresh={() => devices.refetch()}
          tintColor={colors.brand}
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader
        title={t("devices.title")}
        action={
          <Button size="sm" onPress={() => setPicker((v) => !v)}>
            {t("devices.connect")}
          </Button>
        }
      />

      <Card>
        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
          {t("devices.syncNotice")}
        </Text>
      </Card>

      {picker ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: fontWeights.semibold, marginBottom: spacing.sm }}>
            Pick a provider
          </Text>
          <View style={{ gap: spacing.sm }}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p}
                onPress={() => connect.mutate(p)}
                style={{
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>
                  {t(`devices.providers.${p}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {devices.isPending ? (
        <Card>
          <LoadingState />
        </Card>
      ) : devices.isError ? (
        <Card>
          <ErrorState error={devices.error} onRetry={() => devices.refetch()} />
        </Card>
      ) : devices.data.length === 0 ? (
        <EmptyState title={t("devices.noDevices")} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {devices.data.map((d) => (
            <Card key={d.id}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: fontWeights.semibold }}>
                    {t(`devices.providers.${d.provider}`) ?? d.provider}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}>
                    {t("devices.syncedAt", { when: d.last_synced_at ? relative(d.last_synced_at) : "—" })}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <Button
                  size="sm"
                  onPress={() => sync.mutate(d.id)}
                  loading={sync.isPending && sync.variables === d.id}
                  variant="secondary"
                >
                  {t("devices.syncing")}
                </Button>
                <Button
                  size="sm"
                  onPress={() => disconnect.mutate(d.id)}
                  loading={disconnect.isPending && disconnect.variables === d.id}
                  variant="ghost"
                >
                  {t("devices.disconnect")}
                </Button>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}
