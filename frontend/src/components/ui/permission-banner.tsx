"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bell, Camera, HardDrive, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type PermissionKind = "notifications" | "camera" | "storage";

interface PermissionBannerProps {
  kind: PermissionKind;
  /** Optional override for the CTA. If absent the banner uses the default
   *  per-kind handler (e.g. requesting Notification permission). */
  onEnable?: () => void | Promise<void>;
  /** When provided, the banner becomes dismissible. */
  onDismiss?: () => void;
  /** Force show / hide. When omitted the banner reads the current browser
   *  permission state to decide. */
  visible?: boolean;
  className?: string;
}

const KIND_META: Record<PermissionKind, { Icon: React.ElementType; tone: string }> = {
  notifications: { Icon: Bell, tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  camera:        { Icon: Camera, tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  storage:       { Icon: HardDrive, tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30" },
};

function readNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * Top-of-page banner that explains why a browser permission is required and
 * how to enable it. Default behaviour:
 *   - For `notifications`: visible when `Notification.permission !== "granted"`.
 *   - For `camera` / `storage`: visible when explicitly told via `visible` prop.
 *
 * The component is intentionally lightweight (no toast queue, no portal) so
 * surfaces can drop it at the top of their layout without ceremony.
 */
export function PermissionBanner({
  kind,
  onEnable,
  onDismiss,
  visible,
  className,
}: PermissionBannerProps) {
  const t = useTranslations("primitives.permissionBanner");
  const [perm, setPerm] = React.useState<NotificationPermission | "unsupported" | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (kind === "notifications") setPerm(readNotificationPermission());
  }, [kind]);

  const computedVisible = (() => {
    if (dismissed) return false;
    if (typeof visible === "boolean") return visible;
    if (kind !== "notifications") return false;
    return perm === "default" || perm === "denied";
  })();

  if (!computedVisible) return null;

  const meta = KIND_META[kind];
  const Icon = meta.Icon;
  const isPermanentlyDenied = kind === "notifications" && perm === "denied";

  const handleEnable = async () => {
    if (onEnable) {
      await onEnable();
      return;
    }
    if (kind === "notifications" && typeof Notification !== "undefined") {
      const next = await Notification.requestPermission();
      setPerm(next);
    }
  };

  return (
    <div
      role="status"
      data-slot="permission-banner"
      data-kind={kind}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        meta.tone,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 flex-shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-snug">{t(`${kind}.title`)}</p>
        <p className="text-xs opacity-80 mt-0.5 leading-relaxed">
          {isPermanentlyDenied
            ? t(`${kind}.deniedHint`)
            : t(`${kind}.body`)}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!isPermanentlyDenied && (
          <button
            type="button"
            onClick={handleEnable}
            className="h-7 rounded-lg bg-foreground/5 px-3 text-xs font-medium hover:bg-foreground/10 transition-colors cursor-pointer"
          >
            {t("enable")}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              onDismiss();
            }}
            aria-label={t("dismiss")}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-foreground/10 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
