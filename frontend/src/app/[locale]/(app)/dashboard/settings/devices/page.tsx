import { getTranslations } from "next-intl/server";
import { Watch } from "lucide-react";
import { headers } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("settings") };
}
import { DevicesPageClient } from "@/components/dashboard/settings/DevicesPageClient";
import type { Device } from "@/components/dashboard/settings/DeviceConnectionCard";
import { PageHeader } from "@/components/shared/page";

// Keep in sync with SUPPORTED_PROVIDERS in DevicesPageClient
const PROVIDER_LABELS: Record<string, string> = {
  apple_health: "Apple Health",
  google_fit: "Google Fit",
  google_health: "Google Health",
  garmin: "Garmin Connect",
  fitbit: "Fitbit",
  health_connect: "Health Connect",
};

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
          : (PROVIDER_LABELS[provider] ?? provider),
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
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Watch className="h-5 w-5 text-muted-foreground" aria-hidden />
            {t("title")}
          </span>
        }
        description={t("subtitle")}
      />
      <div className="max-w-[960px] mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <DevicesPageClient initialDevices={initialDevices} />
      </div>
    </>
  );
}
