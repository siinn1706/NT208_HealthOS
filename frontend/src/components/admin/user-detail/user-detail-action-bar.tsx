"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Ban, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface UserDetailActionBarProps {
  userId: string;
  displayName: string | null;
  email: string;
  status: string;
  isSelf: boolean;
  isBanning: boolean;
  isUnbanning: boolean;
  onBanClick: () => void;
  onUnban: () => void;
}

export function UserDetailActionBar({
  userId,
  displayName,
  email,
  status,
  isSelf,
  isBanning,
  isUnbanning,
  onBanClick,
  onUnban,
}: UserDetailActionBarProps) {
  const isBanned = status === "banned";
  const label = displayName ?? email;
  const t = useTranslations("admin.userDetail");
  const tc = useTranslations("admin.common");

  // Scroll-shadow: elevate bar when user has scrolled past it
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(userId);
      toast.success("User ID copied to clipboard.");
    } catch {
      toast.error("Failed to copy user ID.");
    }
  }

  return (
    <>
      {/* Sentinel sits just above the bar to detect when bar becomes sticky */}
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />

      <div
        className={[
          "sticky z-20 flex h-14 items-center gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 backdrop-blur",
          "motion-safe:transition-shadow",
          scrolled ? "shadow-sm" : "shadow-none",
        ].join(" ")}
        style={{ top: 0 }}
      >
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 text-sm text-[var(--admin-fg-muted)] hover:text-[var(--admin-fg)] motion-safe:transition-colors"
          aria-label="Back to users list"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>{t("backToUsers")}</span>
        </Link>

        <span className="text-[var(--admin-divider)]" aria-hidden="true">/</span>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-[var(--admin-fg)]" title={label}>
            {label}
          </span>
          <span className="admin-tabular shrink-0 text-[11px] text-[var(--admin-fg-subtle)]">
            {userId.slice(0, 8)}…
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => void handleCopyId()}
            className="gap-1.5 text-[var(--admin-fg-muted)] hover:text-[var(--admin-fg)] motion-safe:transition-colors"
            aria-label="Copy user ID"
          >
            <Copy className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline text-xs">{t("copyId")}</span>
          </Button>

          {!isBanned && (
            <Button
              variant="destructive"
              size="xs"
              onClick={onBanClick}
              disabled={isSelf || isBanning}
              aria-busy={isBanning}
              aria-label={isSelf ? t("cannotBanSelf") : t("actionBar.ban")}
              title={isSelf ? t("cannotBanSelf") : undefined}
              className="motion-safe:transition-opacity"
            >
              <Ban className="size-3.5" aria-hidden="true" />
              <span className="ml-1.5 hidden sm:inline">
                {isBanning ? t("actionBar.banning") : t("actionBar.ban")}
              </span>
            </Button>
          )}

          {isBanned && (
            <Button
              variant="outline"
              size="xs"
              onClick={onUnban}
              disabled={isUnbanning}
              aria-busy={isUnbanning}
              aria-label={t("actionBar.unban")}
              className="text-[var(--admin-status-success)] hover:text-[var(--admin-status-success)] motion-safe:transition-opacity"
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              <span className="ml-1.5 hidden sm:inline">
                {isUnbanning ? t("actionBar.unbanning") : t("actionBar.unban")}
              </span>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
