"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification, ValidationMessages } from "@/hooks/use-notification";
import { PasswordStrengthMeter } from "./password-strength-meter";
import {
  AuthShell,
  AuthBanner,
  PasswordField,
  PendingButton,
  FormFieldError,
  useBreachCheck,
} from "./primitives";
import { track } from "@/lib/analytics";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const tSecurity = useTranslations("auth.security");
  const router = useRouter();
  const { handleApiError, success, handleError } = useNotification();
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedEmailRef = useRef<string>("");
  const latestEmailRef = useRef<string>("");

  const [username, setUsername] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  const breach = useBreachCheck(password, { minLength: 8 });

  useEffect(() => {
    track("auth.register.viewed");
  }, []);

  useEffect(() => {
    if (topError && bannerRef.current) bannerRef.current.focus();
  }, [topError]);

  const isValidEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!username) {
      errors.username = ValidationMessages.required(t("usernameLabel"));
    } else if (username.length < 3) {
      errors.username = t("usernameTooShort");
    } else if (usernameAvailable === false) {
      errors.username = t("usernameTaken");
    }

    if (!email) {
      errors.email = ValidationMessages.required(t("email"));
    } else if (!isValidEmail(email)) {
      errors.email = ValidationMessages.email;
    } else if (emailAvailable === false) {
      errors.email = tErrors("emailTaken");
    }

    if (!password) {
      errors.password = ValidationMessages.required(t("password"));
    } else {
      const failsComplexity =
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

      if (failsComplexity) {
        errors.password = t("passwordRequirements");
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = ValidationMessages.required(t("confirmPassword"));
    } else if (password !== confirmPassword) {
      errors.confirmPassword = ValidationMessages.passwordMismatch;
    }

    // Focus the first invalid field in document order. Doing this after
    // collecting all errors fixes the previous focus-guard bug where guards
    // checked against keys that had just been set in the same statement.
    if (errors.username) {
      usernameRef.current?.focus();
    } else if (errors.email) {
      emailRef.current?.focus();
    } else if (errors.password) {
      passwordRef.current?.focus();
    } else if (errors.confirmPassword) {
      confirmPasswordRef.current?.focus();
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      track("auth.register.validation_failed");
      return false;
    }

    setFieldErrors({});
    return true;
  };

  function handleUsernameChange(value: string) {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(sanitized);
    setUsernameAvailable(null);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: "" }));
    }
  }

  function handleEmailChange(value: string) {
    const normalized = value.trim().toLowerCase();

    setEmail(value);
    setEmailAvailable(null);
    latestEmailRef.current = normalized;
    lastCheckedEmailRef.current = "";

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = null;
    }

    if (normalized && isValidEmail(normalized)) {
      emailDebounceRef.current = setTimeout(() => {
        void checkEmailAvailability(normalized);
      }, 450);
    } else {
      setEmailChecking(false);
    }

    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: "" }));
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: "" }));
    }
    if (fieldErrors.confirmPassword && value === confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  }

  function handleConfirmPasswordChange(value: string) {
    setConfirmPassword(value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  }

  async function checkUsernameAvailability(value: string) {
    if (!value || value.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    try {
      const res = await fetch(`/api/v1/auth/check-username?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      const available = data?.available ?? false;
      setUsernameAvailable(available);

      if (!available) {
        setFieldErrors((prev) => ({
          ...prev,
          username: t("usernameTaken"),
        }));
      } else if (fieldErrors.username) {
        setFieldErrors((prev) => ({ ...prev, username: "" }));
      }
    } catch {
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  }

  async function checkEmailAvailability(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || !isValidEmail(normalized)) {
      setEmailAvailable(null);
      return;
    }

    if (lastCheckedEmailRef.current === normalized) {
      return;
    }
    lastCheckedEmailRef.current = normalized;

    setEmailChecking(true);
    try {
      const res = await fetch(`/api/v1/auth/check-email?email=${encodeURIComponent(normalized)}`);
      const data = await res.json();

      if (latestEmailRef.current !== normalized) {
        return;
      }

      const available = data?.available ?? false;
      setEmailAvailable(available);

      if (!available) {
        setFieldErrors((prev) => ({
          ...prev,
          email: tErrors("emailTaken"),
        }));
      } else if (fieldErrors.email) {
        setFieldErrors((prev) => ({ ...prev, email: "" }));
      }
    } catch {
      if (latestEmailRef.current === normalized) {
        setEmailAvailable(null);
      }
    } finally {
      if (latestEmailRef.current === normalized) {
        setEmailChecking(false);
      }
    }
  }

  function handleUsernameBlur() {
    if (username && username.length >= 3) {
      checkUsernameAvailability(username);
    }
  }

  function handleEmailBlur() {
    const normalized = email.trim().toLowerCase();

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = null;
    }

    if (normalized && isValidEmail(normalized)) {
      checkEmailAvailability(normalized);
    }
  }

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTopError(null);

    if (!validate()) return;

    setIsLoading(true);
    track("auth.register.submitted", { breached: breach.isBreached });
    if (breach.isBreached) {
      track("auth.register.password_breached");
    }

    try {
      const res = await fetch("/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username,
          password,
          purpose: "signup",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errors = handleApiError(data, tErrors("registrationFailed"));
        if (errors.email) {
          setFieldErrors((prev) => ({ ...prev, email: errors.email }));
          setEmailAvailable(false);
        }
        if (errors.username) setFieldErrors((prev) => ({ ...prev, username: errors.username }));
        if (data?.error?.code === "EMAIL_TAKEN") {
          setFieldErrors((prev) => ({
            ...prev,
            email: tErrors("emailTaken"),
          }));
          setEmailAvailable(false);
        }
        if (!errors.email && !errors.username) {
          setTopError(data?.error?.message || tErrors("registrationFailed"));
        }
        track("auth.register.failed", { code: data?.error?.code ?? "UNKNOWN" });
        return;
      }

      success(t("registrationSuccess"));
      track("auth.register.succeeded");
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const errors = handleError(err, tErrors("genericTryAgain"));
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        setTopError(tErrors("genericTryAgain"));
      }
      track("auth.register.errored");
    } finally {
      setIsLoading(false);
    }
  }

  const breachWarning =
    breach.status === "checking"
      ? tSecurity("breach.checking")
      : breach.status === "breached"
        ? tSecurity("breach.breached")
        : null;

  return (
    <AuthShell
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      brand={
        <div className="flex items-center justify-center gap-2">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">H</span>
          </div>
          <span className="font-semibold text-foreground">HealthOS</span>
        </div>
      }
      banner={
        topError ? (
          <div ref={bannerRef} tabIndex={-1} className="outline-none">
            <AuthBanner variant="destructive" description={topError} />
          </div>
        ) : undefined
      }
      footer={
        <p className="text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline transition-colors duration-200"
          >
            {t("loginLink")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-username">
            {t("usernameLabel")}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              ref={usernameRef}
              id="reg-username"
              type="text"
              placeholder={t("usernamePlaceholder")}
              autoComplete="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              onBlur={handleUsernameBlur}
              required
              disabled={isLoading}
              aria-required
              aria-invalid={!!fieldErrors.username}
              aria-describedby={
                fieldErrors.username || (username.length > 0 && username.length < 3)
                  ? "reg-username-error"
                  : undefined
              }
              className="pr-10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {usernameChecking ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : usernameAvailable === true ? (
                <Check className="size-4 text-green-500" aria-hidden="true" />
              ) : usernameAvailable === false ? (
                <X className="size-4 text-destructive" aria-hidden="true" />
              ) : null}
            </div>
          </div>
          <FormFieldError
            id="reg-username-error"
            message={
              fieldErrors.username ||
              (username && username.length > 0 && username.length < 3
                ? t("usernameTooShort")
                : null)
            }
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-email">
            {t("email")}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              ref={emailRef}
              id="reg-email"
              type="email"
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              required
              disabled={isLoading}
              aria-required
              aria-invalid={!!fieldErrors.email}
              aria-describedby={
                fieldErrors.email || (email.length > 0 && !isValidEmail(email))
                  ? "reg-email-error"
                  : undefined
              }
              className="pr-10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {emailChecking ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : emailAvailable === true ? (
                <Check className="size-4 text-green-500" aria-hidden="true" />
              ) : emailAvailable === false ? (
                <X className="size-4 text-destructive" aria-hidden="true" />
              ) : null}
            </div>
          </div>
          <FormFieldError
            id="reg-email-error"
            message={
              fieldErrors.email ||
              (email && !isValidEmail(email) ? ValidationMessages.email : null)
            }
          />
        </div>

        {/* Password */}
        <PasswordField
          ref={passwordRef}
          id="reg-password"
          label={t("password")}
          placeholder={t("passwordPlaceholder")}
          autoComplete="new-password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          required
          requiredMark
          disabled={isLoading}
          minLength={8}
          error={fieldErrors.password}
          renderBelow={(val) => (
            <>
              <PasswordStrengthMeter password={val} />
              {breachWarning && (
                <p
                  className={`mt-1 text-xs ${
                    breach.status === "breached"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                  role={breach.status === "breached" ? "alert" : undefined}
                >
                  {breachWarning}
                </p>
              )}
            </>
          )}
        />

        {/* Confirm Password */}
        <PasswordField
          ref={confirmPasswordRef}
          id="reg-confirm-password"
          label={t("confirmPassword")}
          placeholder={t("confirmPasswordPlaceholder")}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => handleConfirmPasswordChange(e.target.value)}
          required
          requiredMark
          disabled={isLoading}
          error={
            fieldErrors.confirmPassword ||
            (confirmPassword.length > 0 && password !== confirmPassword
              ? t("passwordMismatch")
              : null)
          }
        />

        <PendingButton
          type="submit"
          className="w-full"
          size="lg"
          pending={isLoading}
          disabled={
            isLoading || usernameChecking || usernameAvailable === false || emailAvailable === false
          }
        >
          {t("registerButton")}
        </PendingButton>
      </form>
    </AuthShell>
  );
}
