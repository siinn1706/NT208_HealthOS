"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/hooks/use-notification";
import { AuthShell } from "./primitives/AuthShell";
import { AuthBanner } from "./primitives/AuthBanner";
import { OtpField } from "./primitives/OtpField";
import { PendingButton } from "./primitives/PendingButton";
import { useResendCooldown } from "./primitives/useResendCooldown";
import { track } from "@/lib/analytics";

interface VerifyOTPFormProps {
  email?: string;
  /**
   * OTP purpose — determines which flow to verify against.
   * Defaults to "signup" for the post-registration verification flow.
   */
  purpose?: "signup" | "reset_password";
}

export function VerifyOTPForm({ email, purpose = "signup" }: VerifyOTPFormProps) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const tSecurity = useTranslations("auth.security");
  const router = useRouter();
  const { success, handleApiError } = useNotification();

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Cooldown is keyed by email so multiple windows for the same address share
  // the timer; falls back to a generic key if email is unknown.
  const resend = useResendCooldown(`otp-resend:${email ?? "anon"}:${purpose}`, 60);

  useEffect(() => {
    track("auth.verify_otp.viewed", { purpose });
  }, [purpose]);

  // Move focus to the error banner whenever an error is set, so screen-reader
  // and keyboard users hear the failure immediately.
  useEffect(() => {
    if (error && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [error]);

  async function handleVerify() {
    if (otp.length !== 6) return;
    setError(null);
    setIsLoading(true);
    track("auth.verify_otp.submitted", { purpose });

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, purpose }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errors = handleApiError(data, t("otpInvalid"));
        setError(errors.code || data?.error?.message || t("otpInvalid"));
        track("auth.verify_otp.failed", { code: data?.error?.code ?? "UNKNOWN" });
        return;
      }
      // BFF sets the httpOnly session cookie on signup verification.
      success(t("verificationSuccess"));
      track("auth.verify_otp.succeeded", { purpose });

      if (purpose === "signup") {
        router.push("/onboarding");
      } else if (purpose === "reset_password") {
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError(tErrors("genericTryAgain"));
      track("auth.verify_otp.errored");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!resend.canResend) return;
    setError(null);
    setIsResending(true);
    track("auth.verify_otp.resend_clicked", { purpose });

    try {
      const res = await fetch("/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("resendFailed"));
        return;
      }
      setOtp("");
      resend.arm();
      success(t("verificationSuccess"));
    } catch {
      setError(tErrors("genericTryAgain"));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      title={t("verifyTitle")}
      titleAs="h1"
      subtitle={email ? t("otpDescription", { email }) : t("verifySubtitle")}
      brand={
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="size-7 text-primary" aria-hidden="true" />
          </div>
        </div>
      }
      banner={
        error ? (
          <div ref={bannerRef} tabIndex={-1} className="outline-none">
            <AuthBanner variant="destructive" description={error} />
          </div>
        ) : undefined
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
      <div className="flex flex-col items-center gap-6">
        <OtpField
          id="verify-otp"
          value={otp}
          onChange={setOtp}
          disabled={isLoading}
          autoFocus
          ariaLabel={t("verifyTitle")}
          onComplete={handleVerify}
          hint={t("otpExpiry")}
        />

        <PendingButton
          className="w-full"
          size="lg"
          onClick={handleVerify}
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
