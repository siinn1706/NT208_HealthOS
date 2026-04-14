"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, AlertCircle, Loader2, Check, X } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNotification, ValidationMessages } from "@/hooks/use-notification";
import { PasswordStrengthMeter } from "./password-strength-meter";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const { handleApiError, success, handleError } = useNotification();
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const agentDebugLog = (
    hypothesisId: string,
    location: string,
    message: string,
    data: Record<string, unknown>
  ) => {
    fetch("http://127.0.0.1:7381/ingest/d2543e7e-56f7-498b-ad41-376a106f7a6b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "c4384e",
      },
      body: JSON.stringify({
        sessionId: "c4384e",
        runId: "pre-fix",
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  };

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Client-side validation
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Username validation
    if (!username) {
      errors.username = ValidationMessages.required(t("usernameLabel"));
      usernameRef.current?.focus();
    } else if (username.length < 3) {
      errors.username = t("usernameTooShort");
      if (!errors.username) usernameRef.current?.focus();
    } else if (!usernameAvailable) {
      errors.username = t("usernameTaken");
      if (!errors.username) usernameRef.current?.focus();
    }

    // Email validation
    if (!email) {
      errors.email = ValidationMessages.required(t("email"));
      if (!errors.username && !errors.email) emailRef.current?.focus();
    } else if (!isValidEmail(email)) {
      errors.email = ValidationMessages.email;
      if (!errors.username && !errors.email) emailRef.current?.focus();
    } else if (emailAvailable === false) {
      errors.email = tErrors("emailTaken");
      if (!errors.username && !errors.email) emailRef.current?.focus();
    }

    // Password validation - client-side check (backend also validates)
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

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = ValidationMessages.required(t("confirmPassword"));
    } else if (password !== confirmPassword) {
      errors.confirmPassword = ValidationMessages.passwordMismatch;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // Clear field error on change
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
    // Also clear confirm password error when password changes
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

  // ─── Check username availability ───────────────────────────────────────────
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

      // If username becomes unavailable after check, set error
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

  // ─── Check email availability ──────────────────────────────────────────────
  async function checkEmailAvailability(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || !isValidEmail(normalized)) {
      setEmailAvailable(null);
      return;
    }

    // Avoid duplicate checks for the same value
    if (lastCheckedEmailRef.current === normalized) {
      return;
    }
    lastCheckedEmailRef.current = normalized;

    setEmailChecking(true);
    try {
      const res = await fetch(`/api/v1/auth/check-email?email=${encodeURIComponent(normalized)}`);
      const data = await res.json();

      // Ignore stale responses when user already typed another email
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

  // ─── Handle username blur ─────────────────────────────────────────────────
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

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side validation
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // #region agent log
      agentDebugLog(
        "H7",
        "RegisterForm.tsx:handleSubmit:before-request",
        "register_request_otp_submit",
        {
          hasUsername: Boolean(username),
          hasEmail: Boolean(email),
          hasPassword: Boolean(password),
          passwordLength: password.length,
        }
      );
      // #endregion
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
      // #region agent log
      agentDebugLog(
        "H8",
        "RegisterForm.tsx:handleSubmit:after-response",
        "register_request_otp_response",
        {
          status: res.status,
          ok: res.ok,
          errorCode:
            data && typeof data === "object" && "error" in data
              ? (data as { error?: { code?: string } }).error?.code ?? null
              : null,
        }
      );
      // #endregion

      if (!res.ok) {
        const errors = handleApiError(data, tErrors("registrationFailed"));
        // Map field errors
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
        return;
      }

      // Success - show toast and redirect
      success(t("registrationSuccess"));
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const errors = handleError(err, tErrors("genericTryAgain"));
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg animate-fade-in-up">
      {/* Header */}
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">H</span>
          </div>
          <span className="font-semibold text-foreground">HealthOS</span>
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          {t("registerTitle")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("registerSubtitle")}
        </CardDescription>
      </CardHeader>

      {/* Form */}
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-username">
              {t("usernameLabel")} <span className="text-destructive">*</span>
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
                aria-invalid={!!fieldErrors.username}
                className="pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {usernameChecking ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : usernameAvailable === true ? (
                  <Check className="size-4 text-green-500" aria-hidden="true" />
                ) : usernameAvailable === false ? (
                  <X className="size-4 text-destructive" aria-hidden="true" />
                ) : null}
              </div>
            </div>
            {fieldErrors.username ? (
              <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                {fieldErrors.username}
              </p>
            ) : username && username.length > 0 && username.length < 3 ? (
              <p className="text-xs text-muted-foreground">
                {t("usernameTooShort")}
              </p>
            ) : username && username.length >= 3 && usernameAvailable === false ? (
              <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                {t("usernameTaken")}
              </p>
            ) : null}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">
              {t("email")} <span className="text-destructive">*</span>
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
                aria-invalid={!!fieldErrors.email}
                className="pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {emailChecking ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : emailAvailable === true ? (
                  <Check className="size-4 text-green-500" aria-hidden="true" />
                ) : emailAvailable === false ? (
                  <X className="size-4 text-destructive" aria-hidden="true" />
                ) : null}
              </div>
            </div>
            {fieldErrors.email ? (
              <p className="text-xs text-destructive" role="alert">
                {fieldErrors.email}
              </p>
            ) : email && !isValidEmail(email) ? (
              <p className="text-xs text-muted-foreground">
                {ValidationMessages.email}
              </p>
            ) : email && isValidEmail(email) && emailAvailable === false ? (
              <p className="text-xs text-destructive" role="alert">
                {tErrors("emailTaken")}
              </p>
            ) : null}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">
              {t("password")} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("passwordPlaceholder")}
                autoComplete="new-password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={isLoading}
                aria-invalid={!!fieldErrors.password}
                className="pr-10"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
            {fieldErrors.password && (
              <p className="text-xs text-destructive" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm-password">
              {t("confirmPassword")} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="reg-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("confirmPasswordPlaceholder")}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                required
                disabled={isLoading}
                aria-invalid={!!fieldErrors.confirmPassword}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                {fieldErrors.confirmPassword}
              </p>
            ) : confirmPassword.length > 0 && password !== confirmPassword ? (
              <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                {t("passwordMismatch")}
              </p>
            ) : null}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading || usernameAvailable === false || emailAvailable === false}
          >
            {isLoading && (
              <Loader2 className="animate-spin size-4" aria-hidden="true" />
            )}
            {t("registerButton")}
          </Button>
        </form>
      </CardContent>

      {/* Footer */}
      <CardFooter className="justify-center pt-0">
        <p className="text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline transition-colors duration-200"
          >
            {t("loginLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
