import { getTranslations } from "next-intl/server";
import { Watch } from "lucide-react";
import { headers } from "next/headers";
import { DevicesPageClient } from "@/components/dashboard/settings/DevicesPageClient";
import type { Device } from "@/components/dashboard/settings/DeviceConnectionCard";

// Keep in sync with SUPPORTED_PROVIDERS in DevicesPageClient
const PROVIDER_LABELS: Record<string, string> = {
  apple_health: "Apple Health",
  google_fit: "Google Fit",
  garmin: "Garmin Connect",
  fitbit: "Fitbit",
};

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
  return {
    id: String(candidate.id ?? ""),
    provider,
    name: typeof candidate.name === "string" ? candidate.name : (PROVIDER_LABELS[provider] ?? provider),
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

async function fetchDevices(): Promise<Device[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/devices`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (res.ok) {
      const json = await res.json();
      const list: unknown[] = Array.isArray(json?.data) ? json.data : [];
      return list.map(normalizeDevice).filter((item): item is Device => !!item);
    }
  } catch {}
  return [];
}

export default async function DevicesPage() {
  const t = await getTranslations("dashboard.devices");
  const initialDevices = await fetchDevices();

  return (
    <div className="max-w-[960px] mx-auto space-y-5">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-2">
          <Watch className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Client-driven device list ── */}
      <DevicesPageClient initialDevices={initialDevices} />
    </div>
  );
}
