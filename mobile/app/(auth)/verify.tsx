import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AuthShell } from "@/components/AuthShell";
import { OtpField } from "@/components/ui/OtpField";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  authTokenToSessionUser,
  requestOtp,
  verifyOtp,
  type OtpPurpose,
} from "@/api/endpoints/auth";
import { sessionStore } from "@/auth/session";
import { ApiError } from "@/api/errors";

const RESEND_COOLDOWN = 60;

export default function VerifyScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, fontWeights, typography, spacing } = useTheme();
  const params = useLocalSearchParams<{
    email: string;
    purpose?: OtpPurpose;
  }>();
  const purpose: OtpPurpose = (params.purpose as OtpPurpose) ?? "signup";

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [error, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onResend = async () => {
    if (cooldown > 0 || !params.email) return;
    try {
      // Backend keeps the bcrypt-hashed signup data in Redis under
      // signup:pending:{email} for 10 minutes. Re-requesting OTP without a
      // password is intentional — the backend will reuse the stored data.
      // If the session expired, the request returns SESSION_EXPIRED on the
      // verify-otp call; we surface that as a "please re-register" toast.
      await requestOtp({ email: params.email, purpose });
      setCooldown(RESEND_COOLDOWN);
      toast.success(t("auth.sendCode"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't resend.";
      toast.error(msg);
    }
  };

  const onSubmit = async () => {
    if (!params.email) return;
    if (code.length < 6) {
      setErrorMsg("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await verifyOtp({
        email: params.email,
        purpose,
        code,
      });
      if (result.kind === "auth") {
        await sessionStore.getState().setToken(result.token.access_token);
        sessionStore.getState().setUser(authTokenToSessionUser(result.token));
        router.replace("/(tabs)/home");
        return;
      }
      // Backend only returns `kind: "next"` for reset_password; signup/login
      // unexpectedly landing here would mean a server-side regression.
      if (purpose !== "reset_password") {
        setErrorMsg("Unexpected verification response. Please try again.");
        return;
      }
      router.push({
        pathname: "/(auth)/forgot-password",
        params: { step: "reset", email: result.email },
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Verification failed.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.verifyTitle")}
      subtitle={t("auth.verifySubtitle", { email: params.email ?? "" })}
    >
      <OtpField value={code} onChangeText={setCode} error={error} />
      <Button
        onPress={onSubmit}
        loading={submitting}
        disabled={code.length < 6}
        fullWidth
        size="lg"
      >
        {t("common.continue")}
      </Button>
      <View style={{ alignItems: "center", marginTop: spacing.md }}>
        <Pressable disabled={cooldown > 0} onPress={onResend} hitSlop={8}>
          <Text
            style={{
              color: cooldown > 0 ? colors.textMuted : colors.brand,
              fontWeight: fontWeights.semibold,
              fontSize: typography.sm.fontSize,
            }}
          >
            {cooldown > 0
              ? t("auth.resendIn", { seconds: cooldown })
              : t("auth.resendCode")}
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
