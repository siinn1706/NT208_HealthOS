import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Heart, Activity, Thermometer, Droplets, Wind, Plus } from "lucide-react";
import { getVitalsTimeseries } from "@/lib/dashboard-data";
import { VitalsChartWidget } from "@/components/dashboard/widgets/VitalsChartWidget";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
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
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
        {trend && (
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
  const vitals = await getVitalsTimeseries();
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
          value={latest?.heartRate ?? 72}
          unit="bpm"
          trend="stable"
          color="#EF4444"
        />
        <VitalCard
          icon={Activity}
          label={t("health.vitalLabels.systolic")}
          value={latest?.systolic ?? 118}
          unit="mmHg"
          trend="stable"
          color="#41BCE6"
        />
        <VitalCard
          icon={Activity}
          label={t("health.vitalLabels.diastolic")}
          value={latest?.diastolic ?? 76}
          unit="mmHg"
          trend="down"
          color="#6DE7F7"
        />
        <VitalCard
          icon={Thermometer}
          label={t("health.vitalLabels.temperature")}
          value="36.7"
          unit="°C"
          trend="stable"
          color="#F97316"
        />
        <VitalCard
          icon={Wind}
          label={t("health.vitalLabels.spo2")}
          value="98"
          unit="%"
          trend="stable"
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
            {[
              { name: "Apple Watch Series 9", type: "Smartwatch", status: "connected", lastSync: "2 phút trước" },
              { name: "Omron BP Monitor", type: t("health.vitalLabels.systolic"), status: "connected", lastSync: "1 giờ trước" },
              { name: "Withings Scale", type: "Cân thông minh", status: "disconnected", lastSync: "3 ngày trước" },
            ].map((device) => (
              <li key={device.name} className="px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{device.name}</p>
                  <p className="text-xs text-muted-foreground">{device.type}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className={`text-xs font-medium ${
                      device.status === "connected" ? "text-green-500" : "text-muted-foreground"
                    }`}
                  >
                    {device.status === "connected" ? t("health.deviceConnected") : t("health.deviceDisconnected")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{device.lastSync}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-border">
            <button className="w-full text-xs text-primary hover:underline cursor-pointer">
              {t("health.addDevice")}
            </button>
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
