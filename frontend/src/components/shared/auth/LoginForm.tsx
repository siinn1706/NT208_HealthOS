"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useNotification, ValidationMessages } from "@/hooks/use-notification";
import { getSafePostLoginRedirectPath } from "@/lib/safe-post-login-redirect";

// ─── Google SVG Icon ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="size-4"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

// ─── GitHub SVG Icon ──────────────────────────────────────────────────────────
function GitHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="size-4"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LoginForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleApiError, success, handleError } = useNotification();
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Client-side validation
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!identifier.trim()) {
      errors.identifier = ValidationMessages.required(t("loginIdentifier"));
      identifierRef.current?.focus();
    }

    if (!password) {
      errors.password = ValidationMessages.required(t("password"));
      if (!errors.identifier) {
        passwordRef.current?.focus();
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side validation
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errors = handleApiError(data, tErrors("loginFailed"));
        // Map field errors
        if (errors.identifier || errors.password) {
          setFieldErrors(errors);
        }
        return;
      }

      // Success - show toast and redirect
      success(tErrors("loginSuccess"));

      const onboardingStatus = data?.data?.onboarding_status;
      const fromRaw = searchParams.get("from");
      const fromSafe = getSafePostLoginRedirectPath(fromRaw);

      if (onboardingStatus === "completed" && fromSafe) {
        router.push(fromSafe);
      } else if (onboardingStatus === "completed") {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err) {
      const errors = handleError(err, tErrors("genericTryAgain"));
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Clear field error on change
  function handleIdentifierChange(value: string) {
    setIdentifier(value);
    if (fieldErrors.identifier) {
      setFieldErrors((prev) => ({ ...prev, identifier: "" }));
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: "" }));
    }
  }

  // ─── OAuth ──────────────────────────────────────────────────────────────────
  function handleOAuth(provider: "google" | "github") {
    // Redirect to BFF OAuth initiation route
    window.location.href = `/api/v1/auth/oauth/${provider}`;
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
          {t("loginTitle")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("loginSubtitle")}
        </CardDescription>
      </CardHeader>

      {/* Form */}
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Username or Email */}
          <div className="space-y-1.5">
            <Label htmlFor="login-identifier">{t("loginIdentifier")}</Label>
            <Input
              ref={identifierRef}
              id="login-identifier"
              type="text"
              placeholder={t("loginIdentifierPlaceholder")}
              autoComplete="username"
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              required
              disabled={isLoading}
              aria-invalid={!!fieldErrors.identifier}
            />
            {fieldErrors.identifier && (
              <p className="text-xs text-destructive" role="alert">
                {fieldErrors.identifier}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t("password")}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline transition-colors duration-200"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <Input
                ref={passwordRef}
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={isLoading}
                aria-invalid={!!fieldErrors.password}
                className="pr-10"
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
            {fieldErrors.password && (
              <p className="text-xs text-destructive" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
            />
            <Label
              htmlFor="remember-me"
              className="text-sm font-normal cursor-pointer select-none"
            >
              {t("rememberMe")}
            </Label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading && (
              <Loader2 className="animate-spin size-4" aria-hidden="true" />
            )}
            {t("loginButton")}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">
            {t("orDivider")}
          </span>
          <Separator className="flex-1" />
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleOAuth("google")}
            disabled={isLoading}
          >
            <GoogleIcon />
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleOAuth("github")}
            disabled={isLoading}
          >
            <GitHubIcon />
            GitHub
          </Button>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="justify-center pt-0">
        <p className="text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline transition-colors duration-200"
          >
            {t("registerLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
