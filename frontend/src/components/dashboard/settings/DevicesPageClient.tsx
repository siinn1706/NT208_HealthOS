"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { DeviceConnectionCard, type Device, type DeviceProvider } from "./DeviceConnectionCard";

// Health Connect leads the picker because it's the only provider with
// real ingestion. Connecting from the web is intentionally a soft action —
// it shows guidance to open the Android app rather than POST /v1/devices
// directly, because the connect flow needs the system permission dialog.
const SUPPORTED_PROVIDERS: Array<{
  provider: DeviceProvider;
  label: string;
  /** When true, the connect flow opens an explainer modal rather than
   *  immediately posting to Core BE. */
  webRequiresMobile?: boolean;
}> = [
  { provider: "health_connect", label: "Health Connect", webRequiresMobile: true },
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
    provider !== "fitbit" &&
    provider !== "health_connect"
  ) {
    return null;
  }
  const providerLabel = SUPPORTED_PROVIDERS.find((item) => item.provider === provider)?.label ?? "N/A";
  const lastSyncStatus =
    candidate.last_sync_status === "ok" ||
    candidate.last_sync_status === "partial" ||
    candidate.last_sync_status === "permission_denied" ||
    candidate.last_sync_status === "error"
      ? candidate.last_sync_status
      : null;
  return {
    id: String(candidate.id ?? ""),
    provider,
    name:
      typeof candidate.name === "string"
        ? candidate.name
        : typeof candidate.device_label === "string"
          ? candidate.device_label
          : providerLabel,
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
    lastSyncStatus,
    lastSyncCount:
      typeof candidate.last_sync_count === "number"
        ? candidate.last_sync_count
        : null,
    scopes: Array.isArray(candidate.scopes)
      ? (candidate.scopes as unknown[]).filter(
          (s): s is string => typeof s === "string"
        )
      : null,
    deviceLabel:
      typeof candidate.device_label === "string"
        ? candidate.device_label
        : null,
  };
}

interface DevicesPageClientProps {
  initialDevices?: Device[];
}

const EMPTY_DEVICES: Device[] = [];

export function DevicesPageClient({ initialDevices = EMPTY_DEVICES }: DevicesPageClientProps) {
  const t = useTranslations("dashboard.devices");
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [connectingProvider, setConnectingProvider] = useState<DeviceProvider | null>(null);
  const [connectErrorProvider, setConnectErrorProvider] = useState<DeviceProvider | null>(null);
  const [hcExplainerOpen, setHcExplainerOpen] = useState(false);

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
    // Health Connect can't be connected from the web — the system
    // permission dialog only renders inside the Android app. Surface a
    // modal explainer with the install path instead of POSTing.
    const config = SUPPORTED_PROVIDERS.find((p) => p.provider === provider);
    if (config?.webRequiresMobile) {
      setHcExplainerOpen(true);
      return;
    }

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
              <button type="button"
                key={provider}
                onClick={() => handleConnect(provider)}
                disabled={connectingProvider === provider}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label={`${t("tapToConnect")} ${label}`}
              >
                <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                  <Plus className="size-5 text-muted-foreground" />
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

      {hcExplainerOpen && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="hc-explainer-title"
          className="fixed inset-0 z-50 h-dvh w-dvw max-w-none border-0 bg-black/50 p-4"
          onCancel={(e) => {
            e.preventDefault();
            setHcExplainerOpen(false);
          }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close Health Connect explainer"
            onClick={() => setHcExplainerOpen(false)}
          />
          <div
            className="relative mx-auto flex max-w-md flex-col gap-y-4 rounded-2xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="hc-explainer-title" className="text-lg font-semibold">
              {t("hc.modalTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("hc.modalBody")}
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside text-foreground">
              <li>{t("hc.step1")}</li>
              <li>{t("hc.step2")}</li>
              <li>{t("hc.step3")}</li>
            </ol>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHcExplainerOpen(false)}
                className="h-9 px-4 rounded-lg text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                {t("hc.modalClose")}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
