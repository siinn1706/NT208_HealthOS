"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = "email" | "otp" | "reset";

// ─── Step indicator helper ─────────────────────────────────────────────────────
const STEPS: Step[] = ["email", "otp", "reset"];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              i < currentIndex
                ? "bg-primary text-primary-foreground"
                : i === currentIndex
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentIndex ? "✓" : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-8 rounded transition-colors ${
                i < currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");

  // Step 1 — email
  const [email, setEmail] = useState("");

  // Step 2 — OTP
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);

  // Step 3 — new password
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─── Step 1: Send OTP to email ─────────────────────────────────────────────
  async function handleSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset_password" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errorCode = data?.error?.code;
        if (errorCode === "ACCOUNT_NOT_FOUND_EMAIL") {
          // Email not registered — redirect to signup
          router.push("/register");
          return;
        }
        setError(data?.error?.message || t("sendCodeFailed"));
        return;
      }
      setStep("otp");
    } catch {
      setError(tErrors("genericTryAgain"));
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Step 2: Verify OTP ─────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    if (otp.length !== 6) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, purpose: "reset_password" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("otpInvalid"));
        return;
      }
      setStep("reset");
    } catch {
      setError(tErrors("otpInvalid"));
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Step 2: Resend OTP ─────────────────────────────────────────────────────
  async function handleResend() {
    setError(null);
    setIsResending(true);
    try {
      const res = await fetch("/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset_password" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("resendFailed"));
        return;
      }
      setOtp("");
    } catch {
      setError(tErrors("genericTryAgain"));
    } finally {
      setIsResending(false);
    }
  }

  // ─── Step 3: Reset password ──────────────────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (newPassword.length < 8) {
      setError(t("passwordMinLength"));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(t("passwordMismatch")); 
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password: newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("resetPasswordFailed"));
        return;
      }
      // BFF sets the httpOnly cookie — do NOT store token in localStorage.
      setSuccess(t("resetPasswordSuccess"));
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError(tErrors("genericTryAgain"));
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className="w-full max-w-md shadow-lg animate-fade-in-up">
      {/* ═══ STEP 1 — Email ════════════════════════════════════════════════════ */}
      {step === "email" && (
        <>
          <CardHeader className="space-y-1 pb-4">
            {/* Brand mark */}
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">H</span>
              </div>
              <span className="font-semibold text-foreground">HealthOS</span>
            </div>
            <StepIndicator current="email" />
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Mail className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {t("forgotPasswordTitle")}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("forgotPasswordSubtitle")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSendCode} noValidate className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">{t("email")}</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !email}
              >
                {isLoading && (
                  <Loader2 className="animate-spin size-4" aria-hidden="true" />
                )}
                {t("sendCode")}
              </Button>
            </form>
          </CardContent>

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
        </>
      )}

      {/* ═══ STEP 2 — OTP ══════════════════════════════════════════════════════ */}
      {step === "otp" && (
        <>
          <CardHeader className="space-y-1 pb-4 text-center">
            {/* Brand mark */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">H</span>
              </div>
              <span className="font-semibold text-foreground">HealthOS</span>
            </div>
            <StepIndicator current="otp" />
            <div className="mx-auto mb-1 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {t("forgotPasswordOtpTitle")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("forgotPasswordOtpSubtitle", { email })}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-6">
            {error && (
              <div
                role="alert"
                className="w-full rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <InputOTP
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
              aria-label="Reset password verification code"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <p className="text-xs text-muted-foreground">{t("otpExpiry")}</p>

            <Button
              className="w-full"
              size="lg"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || isLoading}
            >
              {isLoading && (
                <Loader2 className="animate-spin size-4" aria-hidden="true" />
              )}
              {t("verifyButton")}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending || isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              {isResending && (
                <Loader2 className="animate-spin size-3 mr-1" aria-hidden="true" />
              )}
              {t("resendOtp")}
            </Button>
          </CardContent>

          <CardFooter className="justify-center pt-0">
            <p className="text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-primary hover:underline transition-colors duration-200"
              >
                {t("backToLogin")}
              </Link>
            </p>
          </CardFooter>
        </>
      )}

      {/* ═══ STEP 3 — New password ══════════════════════════════════════════════ */}
      {step === "reset" && (
        <>
          <CardHeader className="space-y-1 pb-4">
            {/* Brand mark */}
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">H</span>
              </div>
              <span className="font-semibold text-foreground">HealthOS</span>
            </div>
            <StepIndicator current="reset" />
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {t("resetPasswordTitle")}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("resetPasswordSubtitle")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleResetPassword} noValidate className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  role="status"
                  className="rounded-md border border-green-400/30 bg-green-400/10 px-3 py-2 text-center text-sm text-green-700 dark:text-green-400"
                >
                  {success}
                </div>
              )}

              {/* New password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder={t("newPasswordPlaceholder")}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading || !!success}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? t("hidePassword") : t("showPassword")}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {newPassword && newPassword.length < 8 && (
                  <p className="text-xs text-destructive mt-1">{t("passwordMinLength")}</p>
                )}
              </div>

              {/* Confirm new password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">{t("confirmNewPassword")}</Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("newPasswordPlaceholder")}
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    disabled={isLoading || !!success}
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
                {/* Inline mismatch warning */}
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-xs text-destructive mt-1">{t("passwordMismatch")}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={
                  isLoading ||
                  !!success ||
                  !newPassword ||
                  newPassword.length < 8 ||
                  newPassword !== confirmNewPassword
                }
              >
                {isLoading && (
                  <Loader2 className="animate-spin size-4" aria-hidden="true" />
                )}
                {t("resetPasswordButton")}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center pt-0">
            <p className="text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-primary hover:underline transition-colors duration-200"
              >
                {t("backToLogin")}
              </Link>
            </p>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
