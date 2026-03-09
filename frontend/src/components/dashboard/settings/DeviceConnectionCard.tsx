"use client";

import { useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// BFF TODO: GET /api/v1/devices/status
// Trigger: component mount
// Request: none
// Response: { id; provider; name; connected: boolean; lastSync: string | null; batteryPct: number | null }[]
// Fallback: MOCK_DEVICES from @/data/devices or local state

// BFF TODO: POST /api/v1/devices/:id/sync
// Trigger: user clicks "Sync now"
// Request: { deviceId: string }
// Response: { success: boolean; syncedAt: string }

// BFF TODO: DELETE /api/v1/devices/:id
// Trigger: user clicks "Disconnect"
// Request: none body
// Response: { success: boolean }

type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface Device {
  id: string;
  provider: "apple_health" | "garmin" | "fitbit" | "google_fit" | "oura" | "withings";
  name: string;
  model?: string;
  connected: boolean;
  lastSync: string | null;
  batteryPct: number | null;
}

const PROVIDER_META: Record<
  Device["provider"],
  { label: string; color: string; bg: string; logoPath: string }
> = {
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
  oura: {
    label: "Oura Ring",
    color: "#6C63FF",
    bg: "bg-[#6C63FF]/10",
    logoPath: "",
  },
  withings: {
    label: "Withings",
    color: "#00BFB3",
    bg: "bg-[#00BFB3]/10",
    logoPath: "",
  },
};

interface DeviceConnectionCardProps {
  device: Device;
  onSync: (id: string) => Promise<void>;
  onDisconnect: (id: string) => void;
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Chưa đồng bộ";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

export function DeviceConnectionCard({
  device,
  onSync,
  onDisconnect,
}: DeviceConnectionCardProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const meta = PROVIDER_META[device.provider];

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
      className={cn(
        "rounded-xl border bg-card p-4 space-y-3",
        device.connected ? "border-border" : "border-border opacity-70"
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Provider icon placeholder (colored square with initial) */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
            meta.bg
          )}
          style={{ color: meta.color }}
          aria-hidden
        >
          {meta.label.charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{meta.label}</p>
            {device.connected ? (
              <span className="flex items-center gap-1 text-[11px] text-green-500">
                <Wifi className="w-3 h-3" />
                Đã kết nối
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <WifiOff className="w-3 h-3" />
                Chưa kết nối
              </span>
            )}
          </div>
          {device.model && (
            <p className="text-xs text-muted-foreground mt-0.5">{device.model}</p>
          )}
        </div>

        {/* Battery */}
        {device.batteryPct !== null && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs font-medium text-foreground">{device.batteryPct}%</p>
            <p className="text-[10px] text-muted-foreground">Pin</p>
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
            ? "Đang đồng bộ..."
            : syncStatus === "success"
            ? "Đồng bộ thành công"
            : syncStatus === "error"
            ? "Đồng bộ thất bại"
            : `Lần cuối: ${formatSyncTime(device.lastSync)}`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {device.connected ? (
          <>
            <button
              onClick={handleSync}
              disabled={syncStatus === "syncing"}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                "bg-primary/10 text-primary hover:bg-primary/20",
                syncStatus === "syncing" && "opacity-60 cursor-not-allowed"
              )}
              aria-label={`Đồng bộ ${meta.label}`}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncStatus === "syncing" && "animate-spin")} />
              Đồng bộ ngay
            </button>
            <button
              onClick={() => onDisconnect(device.id)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              aria-label={`Ngắt kết nối ${meta.label}`}
            >
              Ngắt kết nối
            </button>
          </>
        ) : (
          <button
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            aria-label={`Kết nối ${meta.label}`}
            // BFF TODO: GET /api/v1/devices/:provider/auth-url to initiate OAuth
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Kết nối
          </button>
        )}
      </div>
    </div>
  );
}
