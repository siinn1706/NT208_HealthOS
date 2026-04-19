import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  disableMfa,
  fetchMfaStatus,
  regenerateRecoveryCodes,
} from "@/api/endpoints/mfa";
import { fetchSecurityLogs } from "@/api/endpoints/security-logs";
import { ApiError } from "@/api/errors";
import { stash as stashRecoveryCodes } from "@/auth/recoveryCodesStore";
import { relative } from "@/utils/date";

export default function SecurityScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors, spacing, fontWeights, typography } = useTheme();

  const mfa = useQuery({
    queryKey: ["mfa", "status"],
    queryFn: fetchMfaStatus,
  });

  const logs = useQuery({
    queryKey: ["security-logs"],
    queryFn: () => fetchSecurityLogs({ limit: 25 }),
  });

  const [code, setCode] = useState("");

  const disable = useMutation({
    mutationFn: () => disableMfa(code),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["mfa", "status"] });
      setCode("");
      toast.success(t("mfa.disabled"));
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't disable.");
    },
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateRecoveryCodes(code),
    onSuccess(res) {
      setCode("");
      toast.success(t("mfa.regenerate"));
      // Pass codes via the in-memory recoveryCodesStore (consumed on mount),
      // never through router params — see auth/recoveryCodesStore.ts.
      const nonce = stashRecoveryCodes(res.recovery_codes);
      router.push({
        pathname: "/(tabs)/more/security/recovery-codes",
        params: { nonce },
      });
    },
    onError(err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't regenerate.");
    },
  });

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("security.title")} />

      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.lg.fontSize,
            marginBottom: spacing.sm,
          }}
        >
          {t("mfa.title")}
        </Text>
        {mfa.isPending ? (
          <LoadingState />
        ) : mfa.isError ? (
          <ErrorState error={mfa.error} onRetry={() => mfa.refetch()} />
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Text style={{ color: colors.textMuted }}>{t("mfa.status")}:</Text>
              <Badge tone={mfa.data.enabled ? "success" : "neutral"}>
                {mfa.data.enabled ? t("mfa.enabled") : t("mfa.disabled")}
              </Badge>
            </View>
            <View style={{ marginTop: spacing.md }}>
              {mfa.data.enabled ? (
                <View style={{ gap: spacing.md }}>
                  <Input
                    label={t("mfa.code")}
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 8))}
                    keyboardType="number-pad"
                  />
                  <Button
                    onPress={() => disable.mutate()}
                    loading={disable.isPending}
                    disabled={code.length < 6}
                    variant="destructive"
                    fullWidth
                  >
                    {t("mfa.disable")}
                  </Button>
                  <Button
                    onPress={() => regenerate.mutate()}
                    loading={regenerate.isPending}
                    disabled={code.length < 6}
                    variant="secondary"
                    fullWidth
                  >
                    {t("mfa.regenerate")}
                  </Button>
                </View>
              ) : (
                <Button
                  onPress={() => router.push("/(tabs)/more/security/enroll")}
                  fullWidth
                >
                  {t("mfa.enable")}
                </Button>
              )}
            </View>
          </>
        )}
      </Card>

      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.base }}>
          <Pressable
            onPress={() => router.push("/(tabs)/more/security/export")}
            accessibilityRole="button"
            accessibilityLabel="Export account data"
            accessibilityHint="Receive a downloadable archive of everything we have on you"
            style={{
              minHeight: 48,
              paddingVertical: spacing.md,
              flexDirection: "row",
              alignItems: "center",
            }}
            android_ripple={{ color: colors.surfaceMuted }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: fontWeights.medium }}>
                Export account data
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}>
                Receive a downloadable archive of everything we have on you.
              </Text>
            </View>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ color: colors.textMuted }}
            >
              ›
            </Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Pressable
            onPress={() => router.push("/(tabs)/more/security/delete-account")}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityHint="Soft-delete with a 30-day grace period for restore"
            style={{
              minHeight: 48,
              paddingVertical: spacing.md,
              flexDirection: "row",
              alignItems: "center",
            }}
            android_ripple={{ color: colors.surfaceMuted }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.danger, fontWeight: fontWeights.medium }}>
                Delete account
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}>
                Soft-delete with a 30-day grace period for restore.
              </Text>
            </View>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ color: colors.textMuted }}
            >
              ›
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.lg.fontSize,
            marginBottom: spacing.sm,
          }}
        >
          {t("security.log")}
        </Text>
        {logs.isPending ? (
          <LoadingState />
        ) : logs.isError ? (
          <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
        ) : logs.data.length === 0 ? (
          <EmptyState title={t("security.noEvents")} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {logs.data.map((entry) => (
              <View
                key={entry.id}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text
                  style={{ color: colors.text, fontWeight: fontWeights.medium }}
                >
                  {entry.event_type}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.xs.fontSize,
                    marginTop: 2,
                  }}
                >
                  {relative(entry.created_at)}{" "}
                  {entry.ip_address ? `· ${entry.ip_address}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScreenScroll>
  );
}
