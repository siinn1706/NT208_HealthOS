"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/hooks/use-notification";
import { AuthShell } from "./primitives/AuthShell";
import { AuthBanner } from "./primitives/AuthBanner";
import { PasswordField } from "./primitives/PasswordField";
import { OtpField } from "./primitives/OtpField";
import { PendingButton } from "./primitives/PendingButton";
import { FormFieldError } from "./primitives/FormFieldError";
import { useResendCooldown } from "./primitives/useResendCooldown";
import { useBreachCheck } from "./primitives/useBreachCheck";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { track } from "@/lib/analytics";

type Step = "email" | "otp" | "reset";

const STEPS: Step[] = ["email", "otp", "reset"];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
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
            aria-current={i === currentIndex ? "step" : undefined}
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

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const tSecurity = useTranslations("auth.security");
  const router = useRouter();
  const { success: notifySuccess, handleApiError } = useNotification();

  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const breach = useBreachCheck(newPassword, { minLength: 8 });
  const resend = useResendCooldown(`reset-otp:${email || "anon"}`, 60);

  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track("auth.forgot_password.viewed", { step });
  }, [step]);

  useEffect(() => {
    if (error && bannerRef.current) bannerRef.current.focus();
  }, [error]);

  async function handleSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    track("auth.forgot_password.send_code_submitted");

    try {
      const res = await fetch("/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset_password" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errors = handleApiError(data, t("sendCodeFailed"));
        setError(errors.email || data?.error?.message || t("sendCodeFailed"));
        track("auth.forgot_password.send_code_failed", {
          code: data?.error?.code ?? "UNKNOWN",
        });
        return;
      }
      resend.arm();
      setStep("otp");
      track("auth.forgot_password.send_code_succeeded");
    } catch {
      setError(tErrors("genericTryAgain"));
      track("auth.forgot_password.send_code_errored");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) return;
    setError(null);
    setIsLoading(true);
    track("auth.forgot_password.otp_submitted");

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, purpose: "reset_password" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("otpInvalid"));
        track("auth.forgot_password.otp_failed", {
          code: data?.error?.code ?? "UNKNOWN",
        });
        return;
      }
      setStep("reset");
      track("auth.forgot_password.otp_succeeded");
    } catch {
      setError(tErrors("otpInvalid"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!resend.canResend) return;
    setError(null);
    setIsResending(true);
    track("auth.forgot_password.resend_clicked");
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
      resend.arm();
      notifySuccess(t("verificationSuccess"));
    } catch {
      setError(tErrors("genericTryAgain"));
    } finally {
      setIsResending(false);
    }
  }

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
    track("auth.forgot_password.reset_submitted", {
      breached: breach.isBreached,
    });

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password: newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("resetPasswordFailed"));
        track("auth.forgot_password.reset_failed", {
          code: data?.error?.code ?? "UNKNOWN",
        });
        return;
      }
      // Reset succeeded; the user must re-authenticate with the new password.
      // We deliberately do NOT auto-log them in: forcing a fresh /login round-trip
      // ensures a clean session and exercises the standard auth path (rate limits,
      // device fingerprint, etc.).
      setDone(true);
      notifySuccess(t("resetPasswordSuccess"));
      track("auth.forgot_password.reset_succeeded");
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError(tErrors("genericTryAgain"));
    } finally {
      setIsLoading(false);
    }
  }

  const banner = error ? (
    <div ref={bannerRef} tabIndex={-1} className="outline-none">
      <AuthBanner variant="destructive" description={error} />
    </div>
  ) : undefined;

  // ─── STEP 1 ────────────────────────────────────────────────────────────────
  if (step === "email") {
    return (
      <AuthShell
        title={t("forgotPasswordTitle")}
        titleAs="h1"
        subtitle={t("forgotPasswordSubtitle")}
        brand={
          <>
            <StepIndicator current="email" />
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-6 text-primary" aria-hidden="true" />
            </div>
          </>
        }
        banner={banner}
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
        <form onSubmit={handleSendCode} noValidate className="space-y-4">
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
              autoFocus
            />
          </div>

          <PendingButton
            type="submit"
            className="w-full"
            size="lg"
            pending={isLoading}
            disabled={isLoading || !email}
          >
            {t("sendCode")}
          </PendingButton>
        </form>
      </AuthShell>
    );
  }

  // ─── STEP 2 ────────────────────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <AuthShell
        title={t("forgotPasswordOtpTitle")}
        titleAs="h1"
        subtitle={t("forgotPasswordOtpSubtitle", { email })}
        brand={
          <>
            <StepIndicator current="otp" />
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
            </div>
          </>
        }
        banner={banner}
        footer={
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            ← {t("backToLogin")}
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-6">
          <OtpField
            id="reset-otp"
            value={otp}
            onChange={setOtp}
            disabled={isLoading}
            autoFocus
            ariaLabel={t("forgotPasswordOtpTitle")}
            onComplete={handleVerifyOtp}
            hint={t("otpExpiry")}
          />

          <PendingButton
            className="w-full"
            size="lg"
            onClick={handleVerifyOtp}
            pending={isLoading}
            disabled={otp.length !== 6 || isLoading}
          >
            {t("verifyButton")}
          </PendingButton>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending || isLoading || !resend.canResend}
            className="text-muted-foreground hover:text-foreground"
          >
            {!resend.canResend
              ? tSecurity("otpResendIn", { seconds: resend.remaining })
              : isResending
                ? t("resendOtp") + "..."
                : t("resendOtp")}
          </Button>
        </div>
      </AuthShell>
    );
  }

  // ─── STEP 3 ────────────────────────────────────────────────────────────────
  const breachWarning =
    breach.status === "checking"
      ? tSecurity("breach.checking")
      : breach.status === "breached"
        ? tSecurity("breach.breached")
        : null;

  return (
    <AuthShell
      title={t("resetPasswordTitle")}
      titleAs="h1"
      subtitle={t("resetPasswordSubtitle")}
      brand={
        <>
          <StepIndicator current="reset" />
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="size-6 text-primary" aria-hidden="true" />
          </div>
        </>
      }
      banner={
        done ? (
          <AuthBanner variant="success" description={t("resetPasswordSuccess")} />
        ) : (
          banner
        )
      }
      footer={
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          ← {t("backToLogin")}
        </Link>
      }
    >
      <form onSubmit={handleResetPassword} noValidate className="space-y-4">
        <PasswordField
          id="new-password"
          label={t("newPassword")}
          placeholder={t("newPasswordPlaceholder")}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          requiredMark
          disabled={isLoading || done}
          error={
            newPassword && newPassword.length < 8 ? t("passwordMinLength") : null
          }
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

        <PasswordField
          id="confirm-new-password"
          label={t("confirmNewPassword")}
          placeholder={t("newPasswordPlaceholder")}
          autoComplete="new-password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
          requiredMark
          disabled={isLoading || done}
          error={
            confirmNewPassword && newPassword !== confirmNewPassword
              ? t("passwordMismatch")
              : null
          }
        />

        {breach.isBreached && (
          <FormFieldError
            id="breach-warning"
            message={tSecurity("breach.breached")}
          />
        )}

        <PendingButton
          type="submit"
          className="w-full"
          size="lg"
          pending={isLoading}
          disabled={
            isLoading ||
            done ||
            !newPassword ||
            newPassword.length < 8 ||
            newPassword !== confirmNewPassword
          }
        >
          {t("resetPasswordButton")}
        </PendingButton>
      </form>
    </AuthShell>
  );
}
