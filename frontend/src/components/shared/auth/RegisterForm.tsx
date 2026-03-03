"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
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

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Client-side validation: passwords must match
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: fullName, purpose: "signup" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("registrationFailed"));
        return;
      }
      // Redirect to OTP verification page
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
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
          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle
                className="size-4 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-fullname">{t("fullName")}</Label>
            <Input
              id="reg-fullname"
              type="text"
              placeholder={t("fullNamePlaceholder")}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-dob">{t("dateOfBirth")}</Label>
            <Input
              id="reg-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              disabled={isLoading}
              className="[color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">{t("email")}</Label>
            <Input
              id="reg-email"
              type="email"
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-password">{t("password")}</Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("passwordPlaceholder")}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? t("hidePassword") : t("showPassword")
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm-password">
              {t("confirmPassword")}
            </Label>
            <div className="relative">
              <Input
                id="reg-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("confirmPasswordPlaceholder")}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                aria-invalid={
                  confirmPassword.length > 0 && password !== confirmPassword
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword ? t("hidePassword") : t("showPassword")
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {/* Inline validation hint — shown without relying solely on color */}
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                {t("passwordMismatch")}
              </p>
            )}
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
