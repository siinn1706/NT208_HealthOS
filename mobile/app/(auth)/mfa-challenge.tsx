import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AuthShell } from "@/components/AuthShell";
import { OtpField } from "@/components/ui/OtpField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { sessionStore } from "@/auth/session";
import { verifyMfa } from "@/api/endpoints/mfa";
import { ApiError } from "@/api/errors";

export default function MfaChallengeScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, fontWeights, typography, spacing } = useTheme();

  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const value = useRecovery ? recovery.trim() : code;
    if (!value) {
      setError("Enter the code.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await verifyMfa(value);
      await sessionStore.getState().setMfaPending(false);
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async () => {
    await sessionStore.getState().clear();
    toast.info(t("auth.signOut"));
    router.replace("/(auth)/login");
  };

  return (
    <AuthShell title={t("mfa.challengeTitle")} subtitle={t("mfa.challengeBody")}>
      {useRecovery ? (
        <Input
          label={t("mfa.useRecoveryCode")}
          value={recovery}
          onChangeText={setRecovery}
          autoCapitalize="characters"
          autoCorrect={false}
          error={error}
        />
      ) : (
        <OtpField value={code} onChangeText={setCode} error={error} />
      )}
      <Button onPress={onSubmit} loading={submitting} fullWidth size="lg">
        {t("common.continue")}
      </Button>
      <View style={{ alignItems: "center", marginTop: spacing.md }}>
        <Pressable onPress={() => setUseRecovery((v) => !v)} hitSlop={8}>
          <Text
            style={{
              color: colors.brand,
              fontWeight: fontWeights.semibold,
              fontSize: typography.sm.fontSize,
            }}
          >
            {useRecovery ? t("mfa.code") : t("mfa.useRecoveryCode")}
          </Text>
        </Pressable>
      </View>
      <View style={{ alignItems: "center", marginTop: spacing.md }}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
            {t("auth.signOut")}
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
