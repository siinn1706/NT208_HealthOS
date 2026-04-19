import React from "react";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pressable, Text, View } from "react-native";

import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import { sessionStore } from "@/auth/session";
import { login, authTokenToSessionUser } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import { fetchMfaStatus } from "@/api/endpoints/mfa";

const schema = z.object({
  identifier: z.string().min(2, { message: "auth.identifier" }),
  password: z.string().min(1, { message: "auth.password" }),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing, fontWeights, typography } = useTheme();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login(values);
      await sessionStore.getState().rememberIdentifier(values.identifier);
      // Probe MFA status BEFORE persisting the token. We need an Authorization
      // header to hit /v1/mfa/status, so we briefly set the token in memory
      // via setToken({mfaPending: true}) which atomically persists both the
      // token and a SecureStore flag — that flag survives a cold start so the
      // user can't bypass MFA by killing the app on the challenge screen.
      let mfaEnabled = false;
      try {
        await sessionStore
          .getState()
          .setToken(result.access_token, { mfaPending: true });
        const mfa = await fetchMfaStatus();
        mfaEnabled = mfa.enabled;
      } catch {
        // MFA status fetch failed (e.g. offline). Treat as not-enabled so the
        // user isn't soft-locked out. Network 401 is handled by the API client.
      }
      sessionStore.getState().setUser(authTokenToSessionUser(result));
      if (mfaEnabled) {
        router.replace("/(auth)/mfa-challenge");
        return;
      }
      // No MFA — clear the protective flag and continue.
      await sessionStore.getState().setMfaPending(false);
      router.replace("/(tabs)/home");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors.length) {
          err.fieldErrors.forEach((fe) => {
            setError(fe.field as keyof LoginForm, { message: fe.message });
          });
        } else {
          toast.error(err.message, t("auth.loginFailed"));
        }
      } else {
        toast.error(t("auth.loginFailed"));
      }
    }
  });

  return (
    <AuthShell title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <Controller
        control={control}
        name="identifier"
        render={({ field, fieldState }) => (
          <Input
            label={t("auth.identifier")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            keyboardType="email-address"
            error={fieldState.error?.message}
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordField
            label={t("auth.password")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <View style={{ alignItems: "flex-end" }}>
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable>
            <Text
              style={{
                color: colors.brand,
                fontSize: typography.sm.fontSize,
                fontWeight: fontWeights.semibold,
              }}
            >
              {t("auth.forgotPassword")}
            </Text>
          </Pressable>
        </Link>
      </View>
      <Button
        onPress={onSubmit}
        loading={isSubmitting}
        fullWidth
        size="lg"
      >
        {t("auth.signIn")}
      </Button>
      <View style={{ marginTop: spacing.lg, alignItems: "center" }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.sm.fontSize,
          }}
        >
          {t("auth.noAccount")}{" "}
          <Link href="/(auth)/register" asChild>
            <Text
              style={{
                color: colors.brand,
                fontWeight: fontWeights.semibold,
              }}
            >
              {t("auth.signUp")}
            </Text>
          </Link>
        </Text>
      </View>
    </AuthShell>
  );
}
