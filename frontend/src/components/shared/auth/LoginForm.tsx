"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

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

// ─── Facebook SVG Icon ────────────────────────────────────────────────────────
function FacebookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="size-4"
      aria-hidden="true"
    >
      <path
        fill="#3F51B5"
        d="M42 37a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5z"
      />
      <path
        fill="#fff"
        d="M34.368 25H31v13h-5V25h-3v-4h3v-2.41c.002-3.508 1.459-5.59 5.592-5.59H35v4h-2.287C31.104 17 31 17.6 31 18.723V21h4z"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      /**
       * TODO: Implement authentication via BFF
       *
       * EXAMPLE — call the Next.js Route Handler (BFF), which in turn:
       *   1. Validates credentials against Core BE (POST /api/auth/login)
       *   2. Receives access_token + refresh_token from Core BE
       *   3. Stores them in an httpOnly cookie (never exposed to client JS)
       *
       * import { signIn } from "next-auth/react"; // if using Auth.js
       *
       * const result = await signIn("credentials", {
       *   email,
       *   password,
       *   remember: rememberMe,
       *   redirect: false,
       * });
       *
       * if (result?.error) {
       *   setError("Invalid email or password.");
       *   return;
       * }
       *
       * router.push("/dashboard");
       *
       * ── OR ── call BFF Route Handler directly:
       *
       * const res = await fetch("/api/v1/auth/session", {
       *   method: "POST",
       *   headers: { "Content-Type": "application/json" },
       *   body: JSON.stringify({ email, password }),
       * });
       * if (!res.ok) {
       *   const data = await res.json();
       *   setError(data.message || "Login failed.");
       *   return;
       * }
       * router.push("/dashboard");
       */

      // --- DEV BYPASS: admin/admin shortcut for local testing ---
      if (email.trim() === "admin" && password === "admin") {
        router.push("/dashboard");
        return;
      }

      // --- MOCK: simulate successful login ---
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/");
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── OAuth ──────────────────────────────────────────────────────────────────
  async function handleOAuth(provider: "google" | "facebook") {
    /**
     * TODO: Implement OAuth via Auth.js
     *
     * EXAMPLE:
     * import { signIn } from "next-auth/react";
     * await signIn(provider, { callbackUrl: "/" });
     */
    console.log(`OAuth with ${provider} — not implemented yet`);
  }

  return (
    <Card className="w-full max-w-md shadow-lg animate-fade-in-up">
      {/* Header */}
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2 mb-2">
          {/* Logo / Brand mark */}
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
          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* Username or Email */}
          <div className="space-y-1.5">
            <Label htmlFor="login-email">{t("loginIdentifier")}</Label>
            <Input
              id="login-email"
              type="text"
              placeholder={t("loginIdentifierPlaceholder")}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
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
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
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
            onClick={() => handleOAuth("facebook")}
            disabled={isLoading}
          >
            <FacebookIcon />
            Facebook
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
