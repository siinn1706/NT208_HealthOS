import React, { useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/components/ui/Toast";
import {
  connectDevice,
  disconnectDevice,
  listDevices,
  syncDevice,
  type ConnectedDevice,
  type DeviceProvider,
} from "@/api/endpoints/devices";
import { syncDevice as runHealthConnectSync } from "@/healthconnect/orchestrator";
import { HealthConnectUnavailableError } from "@/healthconnect/client";
import { ApiError } from "@/api/errors";
import { relative } from "@/utils/date";

// Health Connect lives at the TOP of the picker because it's the only
// provider with real ingestion today; the rest remain stubs that just
// bump a timestamp.
const PROVIDERS: DeviceProvider[] = [
  "health_connect",
  "apple_health",
  "google_fit",
  "garmin",
  "fitbit",
];

const HC_PROVIDER: DeviceProvider = "health_connect";

export default function DevicesScreen() {
  const t = useT();
  const router = useRouter();
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

  // Health Connect has its own onboarding flow (system permission dialog
  // + initial bootstrap) — route into the dedicated screen instead of
  // POSTing /v1/devices directly. The other providers stay on the
  // legacy stub path so they keep working unchanged.
  const handlePickProvider = (p: DeviceProvider) => {
    setPicker(false);
    if (p === HC_PROVIDER) {
      router.push("/(tabs)/more/devices/health-connect");
      return;
    }
    connect.mutate(p);
  };

  const sync = useMutation({
    mutationFn: async (device: { id: string; provider: string }) => {
      // Health Connect rows go through the orchestrator (real ingest);
      // legacy providers fall through to the stub "bump timestamp" call.
      if (device.provider === HC_PROVIDER) {
        try {
          const summary = await runHealthConnectSync(device.id);
          return { id: device.id, summary };
        } catch (err) {
          if (err instanceof HealthConnectUnavailableError) {
            throw new Error("Health Connect is not installed on this device.");
          }
          throw err;
        }
      }
      const updated = await syncDevice(device.id);
      return { id: device.id, updated };
    },
    onSuccess(result) {
      qc.invalidateQueries({ queryKey: ["devices"] });
      if ("summary" in result && result.summary) {
        const { ingest } = result.summary;
        const total = ingest.inserted + ingest.updated;
        toast.success(
          total > 0
            ? `Synced ${total} new record${total === 1 ? "" : "s"}.`
            : "All caught up."
        );
      } else {
        toast.success(t("common.saved"));
      }
    },
    onError(err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't sync."
      );
    },
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectDevice(id),
    onSuccess(_data, id) {
      qc.setQueryData<ConnectedDevice[]>(["devices"], (cur) => {
        // `cur` is the cached list (or undefined if the cache was empty).
        // `setQueryData` already gives us the right type from the
        // generic; no need to launder it through `unknown` + a
        // conditional `Promise<infer U>` extractor.
        return (cur ?? []).filter((d) => d.id !== id);
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
                onPress={() => handlePickProvider(p)}
                style={{
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>
                  {t(`devices.providers.${p}`)}
                </Text>
                {p === HC_PROVIDER ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: typography.xs.fontSize,
                      marginTop: 2,
                    }}
                  >
                    {t("devices.healthConnect.pickerSubtitle")}
                  </Text>
                ) : null}
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
              {d.last_sync_status && d.provider === HC_PROVIDER ? (
                <Text
                  style={{
                    color:
                      d.last_sync_status === "ok"
                        ? colors.success ?? colors.text
                        : colors.warning ?? colors.textMuted,
                    fontSize: typography.xs.fontSize,
                    marginTop: 4,
                  }}
                >
                  {t(`devices.healthConnect.status.${d.last_sync_status}`)}
                  {typeof d.last_sync_count === "number" && d.last_sync_count > 0
                    ? ` · ${d.last_sync_count} record${d.last_sync_count === 1 ? "" : "s"}`
                    : ""}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <Button
                  size="sm"
                  onPress={() =>
                    sync.mutate({ id: d.id, provider: d.provider as DeviceProvider })
                  }
                  loading={
                    sync.isPending &&
                    typeof sync.variables === "object" &&
                    sync.variables !== null &&
                    "id" in sync.variables &&
                    (sync.variables as { id: string }).id === d.id
                  }
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
