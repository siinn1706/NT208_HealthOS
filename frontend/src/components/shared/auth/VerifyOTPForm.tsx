"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MailCheck, Loader2 } from "lucide-react";
import { useRouter } from "@/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

interface VerifyOTPFormProps {
  /** Email address shown to the user for context. Passed from the page. */
  email?: string;
  /**
   * OTP purpose — determines which flow to verify against.
   * Defaults to "signup" for the post-registration verification flow.
   */
  purpose?: "signup" | "reset_password";
}

export function VerifyOTPForm({ email, purpose = "signup" }: VerifyOTPFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─── Verify OTP ─────────────────────────────────────────────────────────────
  async function handleVerify() {
    if (otp.length !== 6) return;
    setError(null);
    setIsLoading(true);
    const savedPassword = sessionStorage.getItem("temp_signup_password");

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, purpose, password: savedPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || t("otpInvalid"));
        return;
      }
      sessionStorage.removeItem("temp_signup_password");
      // BFF now sets the httpOnly cookie — do NOT store token in localStorage.
      setSuccess(t("verificationSuccess"));
      if (purpose === "signup") {
        // Signup complete: go directly to dashboard
        setTimeout(() => router.push("/dashboard"), 1200);
      } else if (purpose === "reset_password") {
        // Need to proceed with password reset
        setTimeout(() => router.push("/forgot-password?step=reset&email=" + encodeURIComponent(email ?? "")), 1200);
      } else {
        setTimeout(() => router.push("/dashboard"), 1200);
      }
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Resend OTP ─────────────────────────────────────────────────────────────
  async function handleResend() {
    setError(null);
    setIsResending(true);

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
    } catch {
      setError("Không thể gửi lại mã. Vui lòng thử lại.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg animate-fade-in-up">
      {/* Header */}
      <CardHeader className="space-y-1 pb-4 text-center">
        {/* Decorative icon */}
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <MailCheck
            className="size-7 text-primary"
            aria-hidden="true"
          />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          {t("verifyTitle")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {email
            ? t("otpDescription", { email })
            : t("verifySubtitle")}
        </CardDescription>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex flex-col items-center gap-6">
        {/* Status banners */}
        {error && (
          <div
            role="alert"
            className="w-full rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="w-full rounded-md border border-green-400/30 bg-green-400/10 px-3 py-2 text-center text-sm text-green-700 dark:text-green-400"
          >
            {success}
          </div>
        )}

        {/* OTP Input */}
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={otp}
          onChange={setOtp}
          disabled={isLoading || !!success}
          aria-label="OTP verification code"
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

        {/* Verify Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleVerify}
          disabled={otp.length !== 6 || isLoading || !!success}
        >
          {isLoading && (
            <Loader2 className="animate-spin size-4" aria-hidden="true" />
          )}
          {t("verifyButton")}
        </Button>

        {/* Resend */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isResending || isLoading || !!success}
          className="text-muted-foreground hover:text-foreground"
        >
          {isResending && (
            <Loader2 className="animate-spin size-3 mr-1" aria-hidden="true" />
          )}
          {t("resendOtp")}
        </Button>
      </CardContent>

      {/* Footer */}
      <CardFooter className="justify-center pt-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            router.push("/login");
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          ← {t("backToLogin")}
        </a>
      </CardFooter>
    </Card>
  );
}
