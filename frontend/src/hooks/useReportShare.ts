"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type {
  HealthReport,
  ShareRequest,
  ShareResult,
  ShareRecipient,
  ShareChannel,
  AutoShareSettings,
} from "@/types/api";

// ─── Local storage key for auto-share settings ────────────────────────────

const AUTO_SHARE_SETTINGS_KEY = "healthos:auto-share-settings";

function loadAutoShareSettings(): AutoShareSettings {
  if (typeof window === "undefined") {
    return {
      enabled: true,
      severity_threshold: "warning_and_critical",
      default_recipients: [],
      default_channels: ["email"],
      countdown_seconds: 30,
    };
  }
  try {
    const raw = localStorage.getItem(AUTO_SHARE_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AutoShareSettings;
  } catch {}
  return {
    enabled: true,
    severity_threshold: "warning_and_critical",
    default_recipients: [],
    default_channels: ["email"],
    countdown_seconds: 30,
  };
}

function saveAutoShareSettings(settings: AutoShareSettings) {
  try {
    localStorage.setItem(AUTO_SHARE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReportShare() {
  const [sharing, setSharing] = useState(false);
  const [shareResults, setShareResults] = useState<ShareResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoShareSettings, setAutoShareSettings] = useState<AutoShareSettings>(
    loadAutoShareSettings
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoShareTriggered, setAutoShareTriggered] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  // Persist settings changes
  useEffect(() => {
    saveAutoShareSettings(autoShareSettings);
  }, [autoShareSettings]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const shareToContacts = useCallback(
    async (
      report: HealthReport,
      recipients: ShareRecipient[],
      channels: ShareChannel[],
      message?: string,
      locale = "vi"
    ): Promise<ShareResult[]> => {
      if (!recipients.length) {
        toast.error("Vui lòng chọn ít nhất một người nhận.");
        return [];
      }

      // Guard against double-click / concurrent calls
      if (sharing) return [];

      setSharing(true);
      setError(null);
      cancelledRef.current = false;

      const request: ShareRequest = {
        report_id: report.id,
        recipients,
        channels,
        message,
        include_pdf: channels.includes("email"),
        period: report.period,
        locale,
      };

      try {
        const res = await fetch("/api/v1/reports/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message ?? "Gửi báo cáo thất bại.");
        }
        const json = await res.json();
        const results: ShareResult[] = json.data;
        setShareResults(results);

        const sentCount = results.filter((r) => r.status === "sent").length;
        const skippedCount = results.filter((r) => r.status === "skipped").length;
        if (sentCount > 0 && sentCount === results.length) {
          toast.success(`Đã gửi báo cáo đến ${sentCount} người nhận thành công.`);
        } else if (sentCount > 0) {
          toast.warning(`Gửi thành công ${sentCount}/${results.length} người nhận.`);
        } else if (skippedCount > 0) {
          toast.info("Chưa gửi được: kênh email chưa được cấu hình hoặc người nhận chưa dùng HealthOS.");
        } else {
          toast.error("Gửi báo cáo thất bại. Vui lòng thử lại.");
        }
        return results;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
        setError(msg);
        toast.error(msg);
        return [];
      } finally {
        setSharing(false);
      }
    },
    [sharing]
  );

  /** Checks if a report should trigger auto-share based on severity threshold */
  const shouldAutoShare = useCallback(
    (report: HealthReport): boolean => {
      if (!autoShareSettings.enabled) return false;
      if (!autoShareSettings.default_recipients.length) return false;
      if (report.status === "critical") return true;
      if (
        autoShareSettings.severity_threshold === "warning_and_critical" &&
        report.status === "warning"
      )
        return true;
      return false;
    },
    [autoShareSettings]
  );

  /**
   * Start countdown to auto-share if report is critical/warning.
   * Returns true if countdown started.
   */
  const startAutoShareCountdown = useCallback(
    (report: HealthReport): boolean => {
      if (!shouldAutoShare(report)) return false;
      if (autoShareTriggered) return false;

      cancelledRef.current = false;
      setCountdown(autoShareSettings.countdown_seconds);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || cancelledRef.current) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return null;
          }
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setAutoShareTriggered(true);
            // Fire and forget
            shareToContacts(
              report,
              autoShareSettings.default_recipients,
              autoShareSettings.default_channels
            );
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return true;
    },
    [shouldAutoShare, autoShareTriggered, autoShareSettings, shareToContacts]
  );

  const cancelAutoShare = useCallback(() => {
    cancelledRef.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
    toast.info("Đã hủy gửi tự động.");
  }, []);

  const resetShareState = useCallback(() => {
    setShareResults(null);
    setError(null);
    setAutoShareTriggered(false);
    setCountdown(null);
    cancelledRef.current = false;
  }, []);

  const updateAutoShareSettings = useCallback((updates: Partial<AutoShareSettings>) => {
    setAutoShareSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    sharing,
    shareResults,
    error,
    countdown,
    autoShareSettings,
    autoShareTriggered,
    shareToContacts,
    shouldAutoShare,
    startAutoShareCountdown,
    cancelAutoShare,
    resetShareState,
    updateAutoShareSettings,
  };
}
