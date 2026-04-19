"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/format-utils";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceBadge } from "@/components/ui/source-badge";
import type { ProviderId } from "@/types/data-slice";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export type DeviceProvider = "apple_health" | "garmin" | "fitbit" | "google_fit";

export interface Device {
  id: string;
  provider: DeviceProvider;
  name: string;
  model?: string | null;
  connected: boolean;
  lastSync: string | null;
  batteryPct: number | null;
}

const PROVIDER_META: Record<DeviceProvider, { label: string; color: string; bg: string; logoPath: string }> = {
  apple_health: {
    label: "Apple Health",
    color: "#FF2D55",
    bg: "bg-[#FF2D55]/10",
    logoPath: "",
  },
  garmin: {
    label: "Garmin Connect",
    color: "#009CDE",
    bg: "bg-[#009CDE]/10",
    logoPath: "",
  },
  fitbit: {
    label: "Fitbit",
    color: "#00B0B9",
    bg: "bg-[#00B0B9]/10",
    logoPath: "",
  },
  google_fit: {
    label: "Google Fit",
    color: "#4285F4",
    bg: "bg-[#4285F4]/10",
    logoPath: "",
  },
};

interface DeviceConnectionCardProps {
  device: Device;
  onSync: (id: string) => Promise<void>;
  onDisconnect: (id: string) => void;
  onConnect?: (provider: DeviceProvider) => void | Promise<void>;
}

interface SyncLabels {
  noSyncInfo: string;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
}

function formatSyncTime(iso: string | null, labels: SyncLabels, locale: string): string {
  if (!iso) return labels.noSyncInfo;
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return labels.justNow;
  if (diffMins < 60) return labels.minutesAgo(diffMins);
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return labels.hoursAgo(diffHrs);
  return formatDate(d, locale);
}

export function DeviceConnectionCard({
  device,
  onSync,
  onDisconnect,
  onConnect,
}: DeviceConnectionCardProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const t = useTranslations("dashboard.devices");
  const locale = useLocale();
  const meta = PROVIDER_META[device.provider];
  const syncLabels: SyncLabels = {
    noSyncInfo: t("noSyncInfo"),
    justNow:    t("justNow"),
    minutesAgo: (n) => t("minutesAgo", { n }),
    hoursAgo:   (n) => t("hoursAgo",   { n }),
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    try {
      await onSync(device.id);
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Provider icon — uses shared SourceBadge for consistent attribution
            across vitals, reports, and devices (UX plan §K). */}
        <SourceBadge
          provider={device.provider as ProviderId}
          variant="icon"
          className="flex-shrink-0 w-10 h-10 rounded-xl justify-center [&>svg]:size-5"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{meta.label}</p>
            {device.connected ? (
              <span className="flex items-center gap-1 text-[11px] text-green-500">
                <Wifi className="w-3 h-3" />
                {t("connected")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <WifiOff className="w-3 h-3" />
                {t("notConnected")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{device.model ?? "--"}</p>
        </div>

        {/* Battery */}
        {device.batteryPct !== null && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs font-medium text-foreground">{device.batteryPct}%</p>
            <p className="text-[10px] text-muted-foreground">{t("battery")}</p>
          </div>
        )}
      </div>

      {/* Last sync info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {syncStatus === "syncing" && (
          <RefreshCw className="w-3 h-3 animate-spin text-primary" />
        )}
        {syncStatus === "success" && (
          <CheckCircle2 className="w-3 h-3 text-green-500" />
        )}
        {syncStatus === "error" && (
          <AlertCircle className="w-3 h-3 text-red-400" />
        )}
        {syncStatus === "idle" && <Clock className="w-3 h-3" />}
        <span>
          {syncStatus === "syncing"
            ? t("syncing")
            : syncStatus === "success"
            ? t("syncSuccess")
            : syncStatus === "error"
            ? t("syncFailed")
            : `${t("lastSync")} ${formatSyncTime(device.lastSync, syncLabels, locale)}`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {device.connected ? (
          <>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncStatus === "syncing"}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                "bg-primary/10 text-primary hover:bg-primary/20",
                syncStatus === "syncing" && "opacity-60 cursor-not-allowed"
              )}
              aria-label={`${t("syncNow")} ${meta.label}`}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncStatus === "syncing" && "animate-spin")} />
              {t("syncNow")}
            </button>
            <button
              type="button"
              onClick={() => onDisconnect(device.id)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              aria-label={`${t("disconnect")} ${meta.label}`}
            >
              {t("disconnect")}
            </button>
          </>
        ) : (
          onConnect && (
            <button
              type="button"
              onClick={() => void onConnect(device.provider)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer bg-primary/10 text-primary hover:bg-primary/20"
              aria-label={`${t("connect")} ${meta.label}`}
            >
              {t("connect")}
            </button>
          )
        )}
      </div>
    </div>
  );
}
