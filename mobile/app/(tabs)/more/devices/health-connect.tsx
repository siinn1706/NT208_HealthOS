/**
 * Health Connect onboarding flow.
 *
 * Three states:
 *   1. Idle / explainer  — copy + privacy-policy link + "Continue" button.
 *   2. Permission request — fires the native HC consent dialog. On
 *      partial / denied outcomes we surface the right banner.
 *   3. Initial sync — bootstraps the last 14 days for the granted record
 *      types and renders per-record-type counts.
 *
 * On success the screen routes back to the devices list, which now shows
 * the Health Connect row with `last_sync_status='ok'`.
 */
import React, { useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";

import {
  HealthConnectUnavailableError,
  getAvailability,
} from "@/healthconnect/client";
import {
  PermissionGrantResult,
  requestPermissions,
} from "@/healthconnect/permissions";
import { syncDevice as runHealthConnectSync, SyncRunSummary } from "@/healthconnect/orchestrator";
import { MVP_RECORD_TYPES, type HealthConnectRecordType } from "@/healthconnect/types";
import { connectDevice } from "@/api/endpoints/devices";
import { env } from "@/config/env";

type Phase = "explainer" | "requesting" | "syncing" | "done" | "unavailable";

const RECORD_TYPE_LABELS: Record<HealthConnectRecordType, string> = {
  Steps: "Steps",
  HeartRate: "Heart rate",
  SleepSession: "Sleep",
  Weight: "Weight",
  BloodPressure: "Blood pressure",
  ExerciseSession: "Exercise sessions",
};

export default function HealthConnectScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, fontWeights, typography, spacing, radius } = useTheme();

  const [phase, setPhase] = useState<Phase>("explainer");
  const [grant, setGrant] = useState<PermissionGrantResult | null>(null);
  const [summary, setSummary] = useState<SyncRunSummary | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const onboard = useMutation({
    mutationFn: async () => {
      // Step 1: confirm HC is installed.
      const availability = await getAvailability();
      if (availability !== "Installed") {
        throw new HealthConnectUnavailableError(availability);
      }

      // Step 2: ask for permissions. Will open the system consent UI.
      setPhase("requesting");
      const grantResult = await requestPermissions(MVP_RECORD_TYPES);
      setGrant(grantResult);
      if (grantResult.outcome === "denied") {
        return { grantResult, summary: null, deviceId: null };
      }

      // Step 3: register the device on Core BE so future ingest calls
      // have a target. `env.androidPackage` is the actual installed
      // bundle id (varies by channel — dev / staging / prod) so a user
      // with both a dev and prod APK on the same phone gets two
      // distinct device rows (code-review §L5). Individual records
      // carry their own `source_app` once we sync.
      //
      // device_label is opaque to backend dedupe but renders in the
      // device list ("Health Connect (Pixel 7)").
      const device = await connectDevice({
        provider: "health_connect",
        external_account_id: env.androidPackage,
        device_label: "Health Connect",
        scopes: grantResult.granted.map(
          (g) => g.recordType as HealthConnectRecordType
        ),
      });

      // Step 4: kick the orchestrator. `bootstrapDays=14` matches the
      // plan's first-connect window.
      setPhase("syncing");
      const runSummary = await runHealthConnectSync(device.id, {
        recordTypes: grantResult.granted.map(
          (g) => g.recordType as HealthConnectRecordType
        ),
        bootstrapDays: 14,
      });
      return { grantResult, summary: runSummary, deviceId: device.id };
    },
    onSuccess(result) {
      qc.invalidateQueries({ queryKey: ["devices"] });
      setSummary(result.summary);
      setPhase("done");
    },
    onError(err) {
      if (err instanceof HealthConnectUnavailableError) {
        setPhase("unavailable");
        return;
      }
      setErrorText(err instanceof Error ? err.message : String(err));
      setPhase("explainer");
      toast.error("Couldn't connect Health Connect.");
    },
  });

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("devices.healthConnect.title")} />

      {phase === "unavailable" ? (
        <Card>
          <Text
            style={{
              color: colors.text,
              fontWeight: fontWeights.semibold,
              fontSize: typography.lg.fontSize,
            }}
          >
            {t("devices.healthConnect.notInstalledTitle")}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sm.fontSize,
              marginTop: spacing.sm,
            }}
          >
            {t("devices.healthConnect.notInstalledBody")}
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <Button
              onPress={() =>
                Linking.openURL(
                  "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"
                )
              }
              fullWidth
            >
              {t("devices.healthConnect.openPlayStore")}
            </Button>
          </View>
        </Card>
      ) : phase === "done" && summary ? (
        <Card>
          <Text
            style={{
              color: colors.text,
              fontWeight: fontWeights.semibold,
              fontSize: typography.lg.fontSize,
            }}
          >
            {t("devices.healthConnect.allSetTitle")}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sm.fontSize,
              marginTop: spacing.sm,
            }}
          >
            {t("devices.healthConnect.firstSyncSummary", {
              n: summary.ingest.inserted + summary.ingest.updated,
            })}
          </Text>
          <View
            style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceMuted,
            }}
          >
            {summary.perRecordType.map((row) => (
              <Text
                key={row.recordType}
                style={{
                  color: colors.text,
                  fontSize: typography.sm.fontSize,
                  marginBottom: 4,
                }}
              >
                {RECORD_TYPE_LABELS[row.recordType] ?? row.recordType}: {row.mapped}{" "}
                imported
                {row.deleted ? `, ${row.deleted} removed` : ""}
              </Text>
            ))}
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <Button onPress={() => router.back()} fullWidth>
              {t("common.done")}
            </Button>
          </View>
        </Card>
      ) : (
        <>
          <Card>
            <Text
              style={{
                color: colors.text,
                fontWeight: fontWeights.semibold,
                fontSize: typography.lg.fontSize,
              }}
            >
              {t("devices.healthConnect.explainerTitle")}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.sm.fontSize,
                marginTop: spacing.sm,
              }}
            >
              {t("devices.healthConnect.explainerBody")}
            </Text>
            <View
              style={{
                marginTop: spacing.lg,
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              {MVP_RECORD_TYPES.map((rt) => (
                <Text
                  key={rt}
                  style={{
                    color: colors.text,
                    fontSize: typography.sm.fontSize,
                    marginBottom: 4,
                  }}
                >
                  • {RECORD_TYPE_LABELS[rt]}
                </Text>
              ))}
            </View>
          </Card>

          {grant && grant.outcome !== "full" ? (
            <Card>
              <Text
                style={{
                  color: colors.warning ?? colors.text,
                  fontWeight: fontWeights.semibold,
                  fontSize: typography.sm.fontSize,
                }}
              >
                {grant.outcome === "denied"
                  ? t("devices.healthConnect.permissionDeniedTitle")
                  : t("devices.healthConnect.partialGrantTitle")}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.xs.fontSize,
                  marginTop: spacing.sm,
                }}
              >
                {t("devices.healthConnect.partialGrantBody", {
                  missing: grant.missing
                    .map((rt) => RECORD_TYPE_LABELS[rt])
                    .join(", "),
                })}
              </Text>
            </Card>
          ) : null}

          {errorText ? (
            <Card>
              <Text
                style={{
                  color: colors.danger ?? colors.text,
                  fontSize: typography.sm.fontSize,
                }}
              >
                {errorText}
              </Text>
            </Card>
          ) : null}

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button
              onPress={() => onboard.mutate()}
              loading={onboard.isPending}
              fullWidth
            >
              {phase === "syncing"
                ? t("devices.healthConnect.syncing")
                : phase === "requesting"
                  ? t("devices.healthConnect.requesting")
                  : t("devices.healthConnect.continue")}
            </Button>
          </View>

          {phase === "syncing" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                justifyContent: "center",
                marginTop: spacing.sm,
              }}
            >
              <ActivityIndicator color={colors.brand} />
              <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                {t("devices.healthConnect.firstSyncRunning")}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}
