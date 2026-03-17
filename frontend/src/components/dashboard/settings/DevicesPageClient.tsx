"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "@/navigation";
import { DeviceConnectionCard, type Device, type DeviceProvider } from "./DeviceConnectionCard";

const SUPPORTED_PROVIDERS: Array<{ provider: DeviceProvider; label: string }> = [
  { provider: "apple_health", label: "Apple Health" },
  { provider: "google_fit", label: "Google Fit" },
  { provider: "garmin", label: "Garmin Connect" },
  { provider: "fitbit", label: "Fitbit" },
];

function normalizeDevice(raw: unknown): Device | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  const provider = candidate.provider;
  if (
    provider !== "apple_health" &&
    provider !== "google_fit" &&
    provider !== "garmin" &&
    provider !== "fitbit"
  ) {
    return null;
  }
  const providerLabel = SUPPORTED_PROVIDERS.find((item) => item.provider === provider)?.label ?? "N/A";
  return {
    id: String(candidate.id ?? ""),
    provider,
    name: typeof candidate.name === "string" ? candidate.name : providerLabel,
    model: typeof candidate.model === "string" ? candidate.model : null,
    connected: Boolean(candidate.connected),
    lastSync:
      (typeof candidate.last_sync === "string" ? candidate.last_sync : null) ??
      (typeof candidate.lastSync === "string" ? candidate.lastSync : null),
    batteryPct:
      typeof candidate.battery_pct === "number"
        ? candidate.battery_pct
        : typeof candidate.batteryPct === "number"
        ? candidate.batteryPct
        : null,
  };
}

interface DevicesPageClientProps {
  initialDevices?: Device[];
}

export function DevicesPageClient({ initialDevices = [] }: DevicesPageClientProps) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [connectingProvider, setConnectingProvider] = useState<DeviceProvider | null>(null);

  const handleSync = async (id: string) => {
    const res = await fetch(`/api/v1/devices/${id}/sync`, { method: "POST" });
    if (!res.ok) throw new Error("SYNC_FAILED");

    const json = await res.json().catch(() => null);
    const synced = normalizeDevice(json?.data);
    if (!synced) return;

    setDevices((prev) => prev.map((device) => (device.id === id ? synced : device)));
  };

  const handleDisconnect = async (id: string) => {
    const previous = devices;
    setDevices((prev) => prev.filter((device) => device.id !== id));

    try {
      const res = await fetch(`/api/v1/devices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("DISCONNECT_FAILED");
    } catch {
      setDevices(previous);
    }
  };

  const handleConnect = async (provider: DeviceProvider) => {
    setConnectingProvider(provider);
    try {
      const res = await fetch("/api/v1/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("CONNECT_FAILED");

      const json = await res.json().catch(() => null);
      const connected = normalizeDevice(json?.data);
      if (!connected) return;

      setDevices((prev) => {
        const existing = prev.find((device) => device.id === connected.id);
        if (existing) return prev.map((device) => (device.id === connected.id ? connected : device));
        return [connected, ...prev];
      });
    } finally {
      setConnectingProvider(null);
    }
  };

  const connected = devices.filter((device) => device.connected);
  const connectedProviderSet = useMemo(
    () => new Set(connected.map((device) => device.provider)),
    [connected]
  );
  const availableProviders = SUPPORTED_PROVIDERS.filter(
    ({ provider }) => !connectedProviderSet.has(provider)
  );

  return (
    <div className="space-y-6">
      {connected.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Đang kết nối ({connected.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connected.map((device) => (
              <DeviceConnectionCard
                key={device.id}
                device={device}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </section>
      )}

      {availableProviders.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Có thể kết nối ({availableProviders.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableProviders.map(({ provider, label }) => (
              <button
                key={provider}
                onClick={() => handleConnect(provider)}
                disabled={connectingProvider === provider}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label={`Thêm ${label}`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {connectingProvider === provider ? "Đang kết nối..." : "Nhấn để kết nối"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {connected.length === 0 && availableProviders.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có thông tin</p>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
        Dữ liệu từ thiết bị đeo được mã hóa và chỉ dùng để cải thiện trải nghiệm sức khỏe của bạn.
        Bạn có thể ngắt kết nối bất cứ lúc nào. Xem{" "}
        <Link href="/about" className="underline underline-offset-2 hover:text-foreground transition-colors">
          chính sách bảo mật
        </Link>
        .
      </p>
    </div>
  );
}
