"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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
  const t = useTranslations("dashboard.devices");
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [connectingProvider, setConnectingProvider] = useState<DeviceProvider | null>(null);
  const [connectErrorProvider, setConnectErrorProvider] = useState<DeviceProvider | null>(null);

  // P0 truth fix (UX plan §E): handleSync MUST throw on non-2xx so the
  // DeviceConnectionCard can transition into its error state. Previously a
  // failed POST silently returned and the card flipped to "Sync successful"
  // because no error propagated up the await chain.
  const handleSync = async (id: string) => {
    let res: Response;
    try {
      res = await fetch(`/api/v1/devices/${id}/sync`, { method: "POST" });
    } catch (networkErr) {
      throw new Error("DEVICE_SYNC_NETWORK_ERROR", { cause: networkErr });
    }
    if (!res.ok) {
      throw new Error(`DEVICE_SYNC_HTTP_${res.status}`);
    }
    const json = await res.json().catch(() => null);
    const synced = normalizeDevice(json?.data);
    if (!synced) {
      throw new Error("DEVICE_SYNC_INVALID_PAYLOAD");
    }
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
    setConnectErrorProvider(null);
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
    } catch {
      setConnectErrorProvider(provider);
      setTimeout(() => setConnectErrorProvider(null), 3000);
    } finally {
      setConnectingProvider(null);
    }
  };

  const linkedProviderSet = useMemo(
    () => new Set(devices.map((device) => device.provider)),
    [devices]
  );
  const availableProviders = SUPPORTED_PROVIDERS.filter(
    ({ provider }) => !linkedProviderSet.has(provider)
  );

  return (
    <div className="space-y-6">
      {devices.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t("yourDevicesSection", { n: devices.length })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {devices.map((device) => (
              <DeviceConnectionCard
                key={device.id}
                device={device}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
                onConnect={handleConnect}
              />
            ))}
          </div>
        </section>
      )}

      {availableProviders.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t("availableSection", { n: availableProviders.length })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableProviders.map(({ provider, label }) => (
              <button
                key={provider}
                onClick={() => handleConnect(provider)}
                disabled={connectingProvider === provider}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label={`${t("tapToConnect")} ${label}`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {connectingProvider === provider
                      ? t("connecting")
                      : connectErrorProvider === provider
                      ? t("connectFailed")
                      : t("tapToConnect")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
        {t("privacyNote")}
      </p>
    </div>
  );
}
