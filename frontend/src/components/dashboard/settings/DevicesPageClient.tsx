"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Plus, X } from "lucide-react";
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
  /** When true, the connect flow mints a Google OAuth consent URL and
   *  redirects the browser there instead of POSTing to /v1/devices. */
  oauthRedirect?: boolean;
}> = [
  { provider: "health_connect", label: "Health Connect", webRequiresMobile: true },
  { provider: "google_health", label: "Google Health", oauthRedirect: true },
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
    provider !== "google_health" &&
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

export function DevicesPageClient({ initialDevices = [] }: DevicesPageClientProps) {
  const t = useTranslations("dashboard.devices");
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [connectingProvider, setConnectingProvider] = useState<DeviceProvider | null>(null);
  const [connectErrorProvider, setConnectErrorProvider] = useState<DeviceProvider | null>(null);
  const [hcExplainerOpen, setHcExplainerOpen] = useState(false);
  // Outcome of the Google Health OAuth round-trip, read from the query
  // string the callback BFF route redirects back with (?wearable=...).
  const [oauthFlash, setOauthFlash] = useState<"connected" | "error" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("wearable");
    if (outcome !== "connected" && outcome !== "error") return;
    setOauthFlash(outcome);
    // Strip the one-shot params so a refresh / back-nav doesn't re-flash.
    params.delete("wearable");
    params.delete("code");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "")
    );
  }, []);

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

    // Google Health (Luồng B): mint a consent URL server-side and hand the
    // browser to Google. The callback BFF route finishes the connection and
    // redirects back here, so we never resolve a device inline — we leave.
    if (config?.oauthRedirect) {
      setConnectingProvider(provider);
      setConnectErrorProvider(null);
      try {
        const res = await fetch("/api/v1/wearables/google/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("CONNECT_FAILED");
        const json = await res.json().catch(() => null);
        const url = typeof json?.authorization_url === "string" ? json.authorization_url : null;
        if (!url) throw new Error("NO_AUTH_URL");
        // Full-page navigation off the SPA — keep `connecting` set so the
        // button doesn't flicker back before the browser leaves.
        window.location.href = url;
      } catch {
        setConnectErrorProvider(provider);
        setTimeout(() => setConnectErrorProvider(null), 3000);
        setConnectingProvider(null);
      }
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
      {oauthFlash && (
        <div
          role="status"
          className={
            oauthFlash === "connected"
              ? "flex items-center justify-between gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
              : "flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
          }
        >
          <span className="flex items-center gap-2">
            {oauthFlash === "connected" && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {oauthFlash === "connected"
              ? t("connectSuccessGoogle")
              : t("connectErrorGoogle")}
          </span>
          <button
            type="button"
            onClick={() => setOauthFlash(null)}
            aria-label={t("dismiss")}
            className="flex-shrink-0 rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {hcExplainerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hc-explainer-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setHcExplainerOpen(false)}
        >
          <div
            className="max-w-md w-full rounded-2xl border border-border bg-card p-6 space-y-4"
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
        </div>
      )}
    </div>
  );
}
