"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorStateView } from "@/components/shared/state";
import { Button } from "@/components/ui/button";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * App-level error boundary for the authenticated (app) layout segment.
 * Renders the canonical StateView in the "error" kind, so dashboard routes
 * fail with a recoverable, accessible UI instead of a white screen.
 *
 * The error digest (internal Vercel/Next.js error ID) is kept out of the
 * visible copy to avoid confusing users. A "Copy details" button lets
 * power-users and support staff grab it from the clipboard instead.
 */
export default function AppError({ error, reset }: AppErrorProps) {
  const t = useTranslations("state.errors");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[AppError] unhandled error:", error);
  }, [error]);

  const handleCopyDigest = async () => {
    if (!error.digest) return;
    try {
      await navigator.clipboard.writeText(error.digest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API denied — silent fail; digest not exposed in UI
    }
  };

  return (
    <div className="px-4 py-12">
      <ErrorStateView
        title={t("title")}
        description={
          <span className="space-y-1">
            <span className="block">{t("description")}</span>
            {error.digest ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCopyDigest()}
                className="mt-1 h-7 gap-1.5 px-2 text-xs text-muted-foreground/70 hover:text-muted-foreground"
              >
                {copied ? t("detailsCopied") : t("copyDetails")}
              </Button>
            ) : null}
          </span>
        }
        onRetry={reset}
        retryLabel={t("retry")}
        density="route"
      />
    </div>
  );
}
