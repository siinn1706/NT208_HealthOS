import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";

import { ScreenScroll } from "@/components/ScreenScroll";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OtpField } from "@/components/ui/OtpField";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { setupMfa, verifySetup, type MfaSetupResult } from "@/api/endpoints/mfa";
import { ApiError } from "@/api/errors";
import { stash as stashRecoveryCodes } from "@/auth/recoveryCodesStore";

export default function MfaEnrollScreen() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const { colors, fontWeights, spacing, typography, radius } = useTheme();

  const [data, setData] = useState<MfaSetupResult | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [setupTick, setSetupTick] = useState(0);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setData(null);
    setupMfa()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [setupTick]);

  const verify = useMutation({
    mutationFn: () => verifySetup(code),
    onSuccess() {
      qc.invalidateQueries({ queryKey: ["mfa", "status"] });
      toast.success(t("common.saved"));
      if (data?.recovery_codes?.length) {
        // Hand off via in-memory store + nonce. Codes must NEVER be stringified
        // into navigation params — see auth/recoveryCodesStore.ts.
        const nonce = stashRecoveryCodes(data.recovery_codes);
        router.replace({
          pathname: "/(tabs)/more/security/recovery-codes",
          params: { nonce },
        });
      } else {
        router.back();
      }
    },
    onError(err) {
      setOtpError(err instanceof ApiError ? err.message : "Invalid code.");
    },
  });

  if (loadError) {
    return (
      <ScreenScroll>
        <ErrorState error={loadError} onRetry={() => setSetupTick((x) => x + 1)} />
      </ScreenScroll>
    );
  }

  if (!data) {
    return (
      <ScreenScroll>
        <LoadingState />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <Stack.Screen options={{ headerShown: false }} />
      <PageHeader title={t("mfa.enable")} />
      <Card>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.sm.fontSize,
            marginBottom: spacing.md,
          }}
        >
          {t("mfa.scanQr")}
        </Text>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceMuted,
            padding: spacing.base,
            borderRadius: radius.md,
          }}
        >
          <Image
            source={{ uri: `data:image/png;base64,${data.qr_code}` }}
            style={{ width: 220, height: 220 }}
            resizeMode="contain"
          />
        </View>
        <Text
          selectable
          style={{
            marginTop: spacing.md,
            color: colors.textMuted,
            fontSize: typography.xs.fontSize,
          }}
        >
          Secret: {data.secret}
        </Text>
      </Card>

      <Card>
        <Text
          style={{
            color: colors.text,
            fontWeight: fontWeights.semibold,
            fontSize: typography.base.fontSize,
            marginBottom: spacing.md,
          }}
        >
          {t("mfa.code")}
        </Text>
        <OtpField value={code} onChangeText={setCode} error={otpError} />
        <View style={{ marginTop: spacing.md }}>
          <Button
            onPress={() => verify.mutate()}
            loading={verify.isPending}
            disabled={code.length < 6}
            fullWidth
          >
            {t("mfa.verifyAndEnable")}
          </Button>
        </View>
      </Card>
    </ScreenScroll>
  );
}
