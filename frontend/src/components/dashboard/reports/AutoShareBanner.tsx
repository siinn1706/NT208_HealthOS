"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AlertOctagon, AlertTriangle, Share2, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportShare } from "@/hooks/useReportShare";
import type { HealthReport } from "@/types/api";

interface AutoShareBannerProps {
  report: HealthReport;
  onOpenShareDialog: () => void;
  onOpenSettings: () => void;
}

export function AutoShareBanner({
  report,
  onOpenShareDialog,
  onOpenSettings,
}: AutoShareBannerProps) {
  const t = useTranslations("share.autoShare");
  const tShare = useTranslations("share");

  const {
    countdown,
    autoShareTriggered,
    shouldAutoShare,
    startAutoShareCountdown,
    cancelAutoShare,
    autoShareSettings,
  } = useReportShare();

  const started = useRef(false);

  // Start countdown once on mount
  useEffect(() => {
    if (!started.current && shouldAutoShare(report)) {
      started.current = true;
      startAutoShareCountdown(report);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Normal report ────────────────────────────────────────────────────────
  if (report.status === "normal") {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {t("normalTitle")} — {t("normalSubtitle")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          onClick={onOpenShareDialog}
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          {t("shareOptional")}
        </Button>
      </div>
    );
  }

  // ── No auto-share configured ─────────────────────────────────────────────
  if (!shouldAutoShare(report)) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" aria-hidden />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Phát hiện chỉ số bất thường.{" "}
            {autoShareSettings.default_recipients.length === 0
              ? "Chưa có người liên hệ để gửi tự động."
              : "Tự động gửi đã bị tắt."}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onOpenShareDialog}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Chia sẻ
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onOpenSettings}
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Cài đặt
          </Button>
        </div>
      </div>
    );
  }

  // ── Already auto-sent ────────────────────────────────────────────────────
  if (autoShareTriggered) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <Share2 className="h-5 w-5 text-primary shrink-0" aria-hidden />
        <p className="flex-1 text-sm text-muted-foreground">
          Đã tự động gửi báo cáo đến {autoShareSettings.default_recipients.length} người thân.
        </p>
      </div>
    );
  }

  // ── Countdown active ─────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Left: icon + message */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertOctagon className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-destructive">{t("title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("subtitle")}{" "}
              {countdown !== null && (
                <span className="font-bold text-destructive tabular-nums">
                  {countdown}
                </span>
              )}{" "}
              {t("seconds")}
            </p>
            {autoShareSettings.default_recipients.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Gửi đến:{" "}
                {autoShareSettings.default_recipients
                  .map((r) => r.name)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onOpenShareDialog}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            {t("sendNow")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onOpenShareDialog}
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            {t("customize")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={cancelAutoShare}
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Countdown progress bar */}
      {countdown !== null && (
        <div className="mt-3 h-1 bg-destructive/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-destructive rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${(countdown / autoShareSettings.countdown_seconds) * 100}%`,
            }}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
