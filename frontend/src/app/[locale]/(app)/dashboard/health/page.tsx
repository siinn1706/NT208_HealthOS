import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Heart, Activity, Thermometer, Droplets, Wind, Plus } from "lucide-react";
import { headers } from "next/headers";
import { Link } from "@/navigation";
import { getVitalsTimeseries } from "@/lib/dashboard-data";
import { VitalsChartWidget } from "@/components/dashboard/widgets/VitalsChartWidget";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

interface DeviceItem {
  id: string;
  provider: string;
  name: string;
  connected: boolean;
  last_sync: string | null;
}

async function fetchDevices(): Promise<DeviceItem[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const reqHeaders = await headers();
    const res = await fetch(`${appUrl}/api/v1/devices`, {
      cache: "no-store",
      headers: { cookie: reqHeaders.get("cookie") ?? "" },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    if (!Array.isArray(json?.data)) return [];
    return json.data.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any): DeviceItem => ({
        id: typeof item?.id === "string" ? item.id : "",
        provider: typeof item?.provider === "string" ? item.provider : "--",
        name:
          typeof item?.name === "string" && item.name.trim()
            ? item.name
            : "Chưa có thông tin",
        connected: Boolean(item?.connected),
        last_sync: typeof item?.last_sync === "string" ? item.last_sync : null,
      })
    );
  } catch {
    return [];
  }
}

function formatLastSync(iso: string | null): string {
  if (!iso) return "Chưa có thông tin";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Chưa có thông tin";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit: string;
  trend?: "up" | "down" | "stable";
  color: string;
}) {
  const trendColor =
    trend === "up" ? "text-red-500" : trend === "down" ? "text-blue-500" : "text-green-500";
  const trendLabel = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const hasValue = value !== "--" && value !== "N/A";

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-4">
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">
          {value}
          {hasValue && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        {trend && hasValue && (
          <p className={`text-xs mt-1 ${trendColor}`}>
            {trendLabel} so với hôm qua
          </p>
        )}
      </div>
    </div>
  );
}

export default async function HealthPage() {
  const t = await getTranslations("dashboard");
  const [vitals, devices] = await Promise.all([getVitalsTimeseries(), fetchDevices()]);
  const latest = vitals[vitals.length - 1];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("nav.vitalsDevices")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("health.subtitle")}
          </p>
        </div>
        <button
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          aria-label={t("health.addVital")}
        >
          <Plus className="w-4 h-4" />
          {t("health.addVital")}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <VitalCard
          icon={Heart}
          label={t("health.vitalLabels.heartRate")}
          value={latest?.heartRate ?? "--"}
          unit="bpm"
          trend={latest?.heartRate != null ? "stable" : undefined}
          color="#EF4444"
        />
        <VitalCard
          icon={Activity}
          label={t("health.vitalLabels.systolic")}
          value={latest?.systolic ?? "--"}
          unit="mmHg"
          trend={latest?.systolic != null ? "stable" : undefined}
          color="#41BCE6"
        />
        <VitalCard
          icon={Activity}
          label={t("health.vitalLabels.diastolic")}
          value={latest?.diastolic ?? "--"}
          unit="mmHg"
          trend={latest?.diastolic != null ? "stable" : undefined}
          color="#6DE7F7"
        />
        <VitalCard
          icon={Thermometer}
          label={t("health.vitalLabels.temperature")}
          value="--"
          unit="°C"
          trend={undefined}
          color="#F97316"
        />
        <VitalCard
          icon={Wind}
          label={t("health.vitalLabels.spo2")}
          value="--"
          unit="%"
          trend={undefined}
          color="#A78BFA"
        />
      </div>

      {/* Vitals chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-[340px]" />}>
            <VitalsChartWidget data={vitals} />
          </Suspense>
        </div>

        {/* Connected devices */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{t("health.connectedDevices")}</p>
            <Droplets className="w-4 h-4 text-muted-foreground" />
          </div>
          <ul className="divide-y divide-border">
            {devices.length === 0 ? (
              <li className="px-5 py-8 text-sm text-muted-foreground text-center">
                Chưa có thông tin
              </li>
            ) : (
              devices.map((device) => (
                <li key={device.id} className="px-5 py-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.provider || "--"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={`text-xs font-medium ${
                        device.connected ? "text-green-500" : "text-muted-foreground"
                      }`}
                    >
                      {device.connected ? t("health.deviceConnected") : t("health.deviceDisconnected")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatLastSync(device.last_sync)}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="px-5 py-3 border-t border-border">
            <Link
              href="/dashboard/settings/devices"
              className="w-full text-xs text-primary hover:underline cursor-pointer block text-center"
            >
              {t("health.addDevice")}
            </Link>
          </div>
        </div>
      </div>

      {/* Manual entry notice */}
      <div className="rounded-xl border border-border bg-card/50 px-5 py-4 flex items-start gap-3">
        <Activity className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">{t("health.manualEntry")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("health.manualEntryDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}
