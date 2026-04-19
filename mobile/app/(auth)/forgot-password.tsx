import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pressable, Text, View } from "react-native";

import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";
import { OtpField } from "@/components/ui/OtpField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  authTokenToSessionUser,
  checkPasswordBreach,
  requestOtp,
  resetPassword,
  verifyOtp,
} from "@/api/endpoints/auth";
import { useDebouncedValue } from "@/utils/debounce";
import { ApiError } from "@/api/errors";
import { sessionStore } from "@/auth/session";

const RESEND_COOLDOWN = 60;

type Step = "request" | "verify" | "reset";

const requestSchema = z.object({
  email: z.string().email({ message: "Enter a valid email." }),
});
type RequestForm = z.infer<typeof requestSchema>;

const resetSchema = z
  .object({
    password: z.string().min(8, { message: "Use at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPasswordScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, fontWeights, typography, spacing } = useTheme();
  const params = useLocalSearchParams<{ step?: Step; email?: string }>();

  const [step, setStep] = useState<Step>((params.step as Step) ?? "request");
  const [email, setEmail] = useState<string>(params.email ?? "");
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [breachState, setBreachState] = useState<"idle" | "checking" | "ok" | "breached">("idle");

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = resetForm.watch("password");
  const debouncedPassword = useDebouncedValue(passwordValue, 700);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedPassword || debouncedPassword.length < 8) {
      setBreachState("idle");
      return;
    }
    setBreachState("checking");
    checkPasswordBreach(debouncedPassword)
      .then((res) => {
        if (!cancelled) setBreachState(res.breached ? "breached" : "ok");
      })
      .catch(() => {
        if (!cancelled) setBreachState("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPassword]);

  const submitRequest = requestForm.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await requestOtp({ email: values.email, purpose: "reset_password" });
      setEmail(values.email);
      setStep("verify");
      setCooldown(RESEND_COOLDOWN);
      toast.success(t("auth.sendCode"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't send code.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  });

  const submitVerify = async () => {
    if (code.length < 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    setOtpError(null);
    try {
      const res = await verifyOtp({
        email,
        purpose: "reset_password",
        code,
      });
      if (res.kind === "next") {
        setStep("reset");
      } else {
        await sessionStore.getState().setToken(res.token.access_token);
        sessionStore.getState().setUser(authTokenToSessionUser(res.token));
        router.replace("/(tabs)/home");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid code.";
      setOtpError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = resetForm.handleSubmit(async (values) => {
    if (breachState === "breached") {
      resetForm.setError("password", { message: t("auth.passwordBreached") });
      return;
    }
    setSubmitting(true);
    try {
      const tok = await resetPassword({
        email,
        new_password: values.password,
      });
      await sessionStore.getState().setToken(tok.access_token);
      sessionStore.getState().setUser(authTokenToSessionUser(tok));
      toast.success(t("common.saved"));
      router.replace("/(tabs)/home");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't reset password.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  });

  const onResend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await requestOtp({ email, purpose: "reset_password" });
      setCooldown(RESEND_COOLDOWN);
      toast.success(t("auth.sendCode"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't resend.";
      toast.error(msg);
    }
  };

  return (
    <AuthShell title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
      {step === "request" ? (
        <>
          <Controller
            control={requestForm.control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label={t("auth.email")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={fieldState.error?.message}
              />
            )}
          />
          <Button onPress={submitRequest} loading={submitting} fullWidth size="lg">
            {t("auth.sendCode")}
          </Button>
        </>
      ) : null}

      {step === "verify" ? (
        <>
          <Text style={{ color: colors.textMuted }}>
            {t("auth.verifySubtitle", { email })}
          </Text>
          <OtpField value={code} onChangeText={setCode} error={otpError} />
          <Button
            onPress={submitVerify}
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
        </>
      ) : null}

      {step === "reset" ? (
        <>
          <Controller
            control={resetForm.control}
            name="password"
            render={({ field, fieldState }) => (
              <PasswordField
                label={t("auth.newPassword")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                hint={
                  breachState === "breached"
                    ? t("auth.passwordBreached")
                    : breachState === "checking"
                      ? "Checking..."
                      : undefined
                }
              />
            )}
          />
          <Controller
            control={resetForm.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <PasswordField
                label={t("auth.confirmPassword")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button onPress={submitReset} loading={submitting} fullWidth size="lg">
            {t("auth.resetPassword")}
          </Button>
        </>
      ) : null}
    </AuthShell>
  );
}
