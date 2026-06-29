"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import {
  Activity,
  ArrowRight,
  Gauge,
  HeartPulse,
  Loader2,
  Save,
  Thermometer,
  Weight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MetricDraft {
  metric_type: string;
  value: number;
  unit: string;
}

// Single-value vitals. Ranges mirror the Core medical-range validator
// (backend/app/schemas/health_metrics.py); spo2/temperature have no backend
// range so we guard them client-side. source is always "manual" here — this
// form never touches wearable/device sync.
const SIMPLE_FIELDS = [
  { key: "heartRate", metric_type: "heart_rate", unit: "bpm", min: 20, max: 300, icon: HeartPulse },
  { key: "spo2", metric_type: "spo2", unit: "%", min: 50, max: 100, icon: Activity },
  { key: "temperature", metric_type: "body_temperature", unit: "°C", min: 30, max: 45, icon: Thermometer },
  { key: "weight", metric_type: "weight_kg", unit: "kg", min: 1, max: 500, icon: Weight },
] as const;

const BP = {
  systolic: { metric_type: "blood_pressure_systolic", unit: "mmHg", min: 50, max: 300 },
  diastolic: { metric_type: "blood_pressure_diastolic", unit: "mmHg", min: 30, max: 200 },
} as const;

const EMPTY: Record<string, string> = {
  heartRate: "",
  systolic: "",
  diastolic: "",
  spo2: "",
  temperature: "",
  weight: "",
};

function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function toLocalDatetimeInputValue(d: Date): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function AddHealthMetricForm() {
  const t = useTranslations("dashboard.health.metricForm");
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>({ ...EMPTY });
  // Initialised after mount to avoid an SSR/client hydration mismatch on the
  // current-time default. Empty value falls back to "now" at submit time.
  const [recordedAt, setRecordedAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRecordedAt(toLocalDatetimeInputValue(new Date()));
  }, []);

  const setField = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const hasAnyInput = Object.values(values).some((v) => v.trim().length > 0);

  function buildDrafts(): { drafts: MetricDraft[]; error: string | null } {
    const drafts: MetricDraft[] = [];

    for (const f of SIMPLE_FIELDS) {
      const raw = values[f.key];
      if (!raw.trim()) continue;
      const n = parseNumber(raw);
      if (n === null || n < f.min || n > f.max) {
        return {
          drafts: [],
          error: t("errorRange", { label: t(f.key), min: f.min, max: f.max, unit: f.unit }),
        };
      }
      drafts.push({ metric_type: f.metric_type, value: n, unit: f.unit });
    }

    const hasSys = values.systolic.trim().length > 0;
    const hasDia = values.diastolic.trim().length > 0;
    if (hasSys || hasDia) {
      const sys = parseNumber(values.systolic);
      const dia = parseNumber(values.diastolic);
      if (sys === null || dia === null) {
        return { drafts: [], error: t("errorBpPair") };
      }
      if (sys < BP.systolic.min || sys > BP.systolic.max) {
        return {
          drafts: [],
          error: t("errorRange", { label: t("systolic"), min: BP.systolic.min, max: BP.systolic.max, unit: BP.systolic.unit }),
        };
      }
      if (dia < BP.diastolic.min || dia > BP.diastolic.max) {
        return {
          drafts: [],
          error: t("errorRange", { label: t("diastolic"), min: BP.diastolic.min, max: BP.diastolic.max, unit: BP.diastolic.unit }),
        };
      }
      drafts.push({ metric_type: BP.systolic.metric_type, value: sys, unit: BP.systolic.unit });
      drafts.push({ metric_type: BP.diastolic.metric_type, value: dia, unit: BP.diastolic.unit });
    }

    if (drafts.length === 0) return { drafts: [], error: t("errorEmpty") };
    return { drafts, error: null };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const { drafts, error } = buildDrafts();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    const recordedIso = recordedAt
      ? new Date(recordedAt).toISOString()
      : new Date().toISOString();

    try {
      const results = await Promise.allSettled(
        drafts.map((d) =>
          fetch("/api/v1/health-metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...d, recorded_at: recordedIso, source: "manual" }),
          }).then((res) => {
            if (!res.ok) throw new Error(String(res.status));
            return res;
          })
        )
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      if (ok === drafts.length) {
        toast.success(t("successSaved", { count: ok }));
        setValues({ ...EMPTY });
      } else if (ok > 0) {
        toast.warning(t("partialSaved", { ok, total: drafts.length }));
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  }

  function renderField(
    key: string,
    label: string,
    unit: string,
    Icon: React.ElementType
  ) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`metric-${key}`} className="text-sm font-medium text-foreground">
          <Icon className="inline size-3.5 mr-1.5 -mt-0.5 text-muted-foreground" aria-hidden />
          {label}
        </Label>
        <div className="relative">
          <Input
            id={`metric-${key}`}
            type="number"
            inputMode="decimal"
            step="any"
            value={values[key]}
            onChange={(e) => setField(key, e.target.value)}
            placeholder={t("placeholder")}
            disabled={saving}
            className="pr-14"
            aria-label={label}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5"
    >
      <p className="text-sm text-muted-foreground">{t("intro")}</p>

      {renderField("heartRate", t("heartRate"), "bpm", HeartPulse)}

      {/* Blood pressure — systolic + diastolic are saved together */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">
          <Gauge className="inline size-3.5 mr-1.5 -mt-0.5 text-muted-foreground" aria-hidden />
          {t("bloodPressure")}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Input
              id="metric-systolic"
              type="number"
              inputMode="decimal"
              step="any"
              value={values.systolic}
              onChange={(e) => setField("systolic", e.target.value)}
              placeholder={t("systolic")}
              disabled={saving}
              className="pr-14"
              aria-label={t("systolic")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              mmHg
            </span>
          </div>
          <div className="relative">
            <Input
              id="metric-diastolic"
              type="number"
              inputMode="decimal"
              step="any"
              value={values.diastolic}
              onChange={(e) => setField("diastolic", e.target.value)}
              placeholder={t("diastolic")}
              disabled={saving}
              className="pr-14"
              aria-label={t("diastolic")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              mmHg
            </span>
          </div>
        </div>
      </div>

      {renderField("spo2", t("spo2"), "%", Activity)}
      {renderField("temperature", t("temperature"), "°C", Thermometer)}
      {renderField("weight", t("weight"), "kg", Weight)}

      <div className="space-y-1.5">
        <Label htmlFor="metric-recorded-at" className="text-sm font-medium text-foreground">
          {t("recordedAt")}
        </Label>
        <Input
          id="metric-recorded-at"
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          disabled={saving}
          className="w-full"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/health")}
          className="gap-1.5 text-muted-foreground"
        >
          {t("viewMetrics")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="submit"
          disabled={saving || !hasAnyInput}
          className={cn("gap-2 sm:min-w-40")}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
