import React, { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Text, View } from "react-native";

import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { useToast } from "@/components/ui/Toast";
import {
  checkEmail,
  checkPasswordBreach,
  checkUsername,
  requestOtp,
} from "@/api/endpoints/auth";
import { useDebouncedValue } from "@/utils/debounce";
import { ApiError } from "@/api/errors";

const schema = z
  .object({
    name: z.string().min(2, { message: "Please enter your full name." }),
    username: z
      .string()
      .min(3, { message: "Min 3 characters." })
      .regex(/^[a-zA-Z0-9_.-]+$/, { message: "Only letters, numbers, _ . -" }),
    email: z.string().email({ message: "Enter a valid email." }),
    password: z.string().min(8, { message: "Use at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

type RegisterForm = z.infer<typeof schema>;

interface AvailabilityState {
  status: "idle" | "checking" | "available" | "taken";
  message?: string;
}

export default function RegisterScreen() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { colors, fontWeights, typography } = useTheme();

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const usernameValue = watch("username");
  const emailValue = watch("email");
  const passwordValue = watch("password");

  const debouncedUsername = useDebouncedValue(usernameValue, 500);
  const debouncedEmail = useDebouncedValue(emailValue, 500);
  const debouncedPassword = useDebouncedValue(passwordValue, 700);

  const [usernameState, setUsernameState] = useState<AvailabilityState>({
    status: "idle",
  });
  const [emailState, setEmailState] = useState<AvailabilityState>({
    status: "idle",
  });
  const [breachState, setBreachState] = useState<AvailabilityState>({
    status: "idle",
  });

  useEffect(() => {
    let cancelled = false;
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameState({ status: "idle" });
      return;
    }
    setUsernameState({ status: "checking" });
    checkUsername(debouncedUsername)
      .then((res) => {
        if (cancelled) return;
        setUsernameState(
          res.available
            ? { status: "available", message: t("auth.usernameAvailable") }
            : { status: "taken", message: t("auth.usernameTaken") }
        );
      })
      .catch(() => {
        if (!cancelled) setUsernameState({ status: "idle" });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, t]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedEmail || !/^.+@.+\..+$/.test(debouncedEmail)) {
      setEmailState({ status: "idle" });
      return;
    }
    setEmailState({ status: "checking" });
    checkEmail(debouncedEmail)
      .then((res) => {
        if (cancelled) return;
        setEmailState(
          res.available
            ? { status: "available", message: t("auth.emailAvailable") }
            : { status: "taken", message: t("auth.emailTaken") }
        );
      })
      .catch(() => {
        if (!cancelled) setEmailState({ status: "idle" });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail, t]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedPassword || debouncedPassword.length < 8) {
      setBreachState({ status: "idle" });
      return;
    }
    setBreachState({ status: "checking" });
    checkPasswordBreach(debouncedPassword)
      .then((res) => {
        if (cancelled) return;
        setBreachState(
          res.breached
            ? { status: "taken", message: t("auth.passwordBreached") }
            : { status: "available" }
        );
      })
      .catch(() => {
        if (!cancelled) setBreachState({ status: "idle" });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPassword, t]);

  const onSubmit = handleSubmit(async (values) => {
    if (usernameState.status === "taken") {
      setError("username", { message: t("auth.usernameTaken") });
      return;
    }
    if (emailState.status === "taken") {
      setError("email", { message: t("auth.emailTaken") });
      return;
    }
    if (breachState.status === "taken") {
      setError("password", { message: t("auth.passwordBreached") });
      return;
    }
    try {
      await requestOtp({
        email: values.email,
        purpose: "signup",
        name: values.name,
        username: values.username,
        password: values.password,
      });
      // The bcrypt-hashed password is stored server-side under
      // signup:pending:{email} in Redis (see backend request-otp). Do NOT pass
      // the plaintext password through navigation params — expo-router state
      // is observable in DevTools and may be restored across app foreground.
      router.push({
        pathname: "/(auth)/verify",
        params: {
          email: values.email,
          purpose: "signup",
        },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Couldn't send verification code.");
      }
    }
  });

  return (
    <AuthShell
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <View style={{ alignItems: "center" }}>
          <Text
            style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}
          >
            {t("auth.haveAccount")}{" "}
            <Link href="/(auth)/login" asChild>
              <Text style={{ color: colors.brand, fontWeight: fontWeights.semibold }}>
                {t("auth.signIn")}
              </Text>
            </Link>
          </Text>
        </View>
      }
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label={t("auth.name")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoComplete="name"
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="username"
        render={({ field, fieldState }) => (
          <Input
            label={t("auth.username")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            error={
              fieldState.error?.message ??
              (usernameState.status === "taken" ? usernameState.message : null)
            }
            hint={
              usernameState.status === "available"
                ? usernameState.message
                : usernameState.status === "checking"
                  ? "Checking..."
                  : undefined
            }
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label={t("auth.email")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            error={
              fieldState.error?.message ??
              (emailState.status === "taken" ? emailState.message : null)
            }
            hint={
              emailState.status === "available"
                ? emailState.message
                : emailState.status === "checking"
                  ? "Checking..."
                  : undefined
            }
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
            error={
              fieldState.error?.message ??
              (breachState.status === "taken" ? breachState.message : null)
            }
            hint={
              breachState.status === "available"
                ? "Looks strong."
                : breachState.status === "checking"
                  ? "Checking..."
                  : t("auth.passwordTooShort")
            }
          />
        )}
      />
      <Controller
        control={control}
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
      <Button onPress={onSubmit} loading={isSubmitting} fullWidth size="lg">
        {t("auth.signUp")}
      </Button>
    </AuthShell>
  );
}
