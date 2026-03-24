"use client";

import { useState, useTransition } from "react";
import { Heart, Activity, Thermometer, Droplets, Wind, Plus } from "lucide-react";
import { Link } from "@/navigation";
import { TimeRangeSelector } from "@/components/charts/TimeRangeSelector";
import { PeriodComparisonChart } from "@/components/charts/PeriodComparisonChart";
import type { ReportPeriod } from "@/types/api";

interface DeviceItem {
  id: string;
  provider: string;
  name: string;
  connected: boolean;
  last_sync: string | null;
}

async function fetchDevices(): Promise<DeviceItem[]> {
  const res = await fetch("/api/v1/devices", { credentials: "include" });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  if (!Array.isArray(json?.data)) return [];
  return json.data.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any): DeviceItem => ({
      id: typeof item?.id === "string" ? item.id : "",
      provider: typeof item?.provider === "string" ? item.provider : "--",
      name: typeof item?.name === "string" && item.name.trim() ? item.name : "Chưa có thông tin",
      connected: Boolean(item?.connected),
      last_sync: typeof item?.last_sync === "string" ? item.last_sync : null,
    })
  );
}

async function fetchVitals(period: ReportPeriod) {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const res = await fetch(`/api/v1/vitals/timeseries?days=${days}`, { credentials: "include" });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? [];
}

async function fetchComparison(period: ReportPeriod) {
  const res = await fetch(
    `/api/v1/analytics/compare?metrics=heart_rate,blood_pressure_systolic,blood_pressure_diastolic&period=${period}`,
    { credentials: "include" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? [];
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

export default function HealthPage() {
  const [period, setPeriod] = useState<ReportPeriod>("7d");
  const [comparisonData, setComparisonData] = useState<Array<{ date: string; values: Record<string, number | null> }>>([]);
  const [latestVital, setLatestVital] = useState<{ heartRate?: number; systolic?: number; diastolic?: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [devicesLoaded, setDevicesLoaded] = useState(false);

  const loadData = (p: ReportPeriod) => {
    startTransition(async () => {
      const [vitals, comparison, devs] = await Promise.all([
        fetchVitals(p),
        fetchComparison(p),
        devicesLoaded ? Promise.resolve(devices) : (async () => {
          const d = await fetchDevices();
          setDevices(d);
          setDevicesLoaded(true);
          return d;
        })(),
      ]);
      if (vitals && Array.isArray(vitals) && vitals.length > 0) {
        const last = vitals[vitals.length - 1];
        setLatestVital({
          heartRate: last.heart_rate,
          systolic: last.systolic,
          diastolic: last.diastolic,
        });
      }
      if (comparison) setComparisonData(comparison);
    });
  };

  // Initial load
  useState(() => {
    loadData("7d");
    fetchDevices().then((d) => {
      setDevices(d);
      setDevicesLoaded(true);
    });
  });

  const handlePeriodChange = (newPeriod: ReportPeriod | "custom") => {
    if (newPeriod === "custom") return;
    setPeriod(newPeriod);
    loadData(newPeriod);
  };

  const latest = latestVital;
  const dates = comparisonData.map((d) => d.date);
  const hrValues = comparisonData.map((d) => d.values["heart_rate"] ?? 0);
  const sysValues = comparisonData.map((d) => d.values["blood_pressure_systolic"] ?? 0);
  const diaValues = comparisonData.map((d) => d.values["blood_pressure_diastolic"] ?? 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Vitals & Thiết bị</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Theo dõi các chỉ số sức khỏe của bạn
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={period} onChange={handlePeriodChange} />
          <button
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            aria-label="Thêm chỉ số"
          >
            <Plus className="w-4 h-4" />
            Thêm chỉ số
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <VitalCard
          icon={Heart}
          label="Nhịp tim"
          value={latest?.heartRate ?? "--"}
          unit="bpm"
          trend={latest?.heartRate != null ? "stable" : undefined}
          color="#EF4444"
        />
        <VitalCard
          icon={Activity}
          label="Huyết áp tâm thu"
          value={latest?.systolic ?? "--"}
          unit="mmHg"
          trend={latest?.systolic != null ? "stable" : undefined}
          color="#41BCE6"
        />
        <VitalCard
          icon={Activity}
          label="Huyết áp tâm trương"
          value={latest?.diastolic ?? "--"}
          unit="mmHg"
          trend={latest?.diastolic != null ? "stable" : undefined}
          color="#6DE7F7"
        />
        <VitalCard
          icon={Thermometer}
          label="Nhiệt độ"
          value="--"
          unit="°C"
          trend={undefined}
          color="#F97316"
        />
        <VitalCard
          icon={Wind}
          label="SpO2"
          value="--"
          unit="%"
          trend={undefined}
          color="#A78BFA"
        />
      </div>

      {/* Vitals chart + Comparison chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Comparison chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">So sánh theo kỳ</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Nhịp tim & Huyết áp theo thời gian</p>
          </div>
          {isPending ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Đang tải...
            </div>
          ) : comparisonData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Chưa có dữ liệu
            </div>
          ) : (
            <PeriodComparisonChart
              currentLabel={period}
              currentData={hrValues}
              previousData={[]}
              dates={dates}
              unit=""
              height={260}
            />
          )}
        </div>

        {/* Connected devices */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Thiết bị đã kết nối</p>
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
                      {device.connected ? "Đã kết nối" : "Chưa kết nối"}
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
              Thêm thiết bị
            </Link>
          </div>
        </div>
      </div>

      {/* Manual entry notice */}
      <div className="rounded-xl border border-border bg-card/50 px-5 py-4 flex items-start gap-3">
        <Activity className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Nhập liệu thủ công</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bạn có thể nhập các chỉ số sức khỏe thủ công nếu không có thiết bị wearable.
          </p>
        </div>
      </div>
    </div>
  );
}
