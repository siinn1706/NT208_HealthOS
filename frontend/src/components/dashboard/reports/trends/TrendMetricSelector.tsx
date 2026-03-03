"use client";

import { useRouter, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReportPeriod } from "@/types/api";

const METRICS = [
  "heart_rate",
  "blood_pressure",
  "calories",
  "steps",
  "sleep",
  "bmi",
  "weight",
] as const;

type Metric = (typeof METRICS)[number];

interface TrendMetricSelectorProps {
  metric: string;
  period: ReportPeriod;
}

export function TrendMetricSelector({ metric, period }: TrendMetricSelectorProps) {
  const t = useTranslations("trends");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period tabs */}
      <Tabs
        value={period}
        onValueChange={(v) => update("period", v)}
        className="shrink-0"
      >
        <TabsList className="h-8">
          <TabsTrigger value="7d" className="text-xs px-3">7N</TabsTrigger>
          <TabsTrigger value="30d" className="text-xs px-3">30N</TabsTrigger>
          <TabsTrigger value="90d" className="text-xs px-3">90N</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Metric selector */}
      <Select value={metric} onValueChange={(v) => update("metric", v)}>
        <SelectTrigger className="h-8 w-48 text-xs">
          <SelectValue placeholder={t("selectMetric")} />
        </SelectTrigger>
        <SelectContent>
          {METRICS.map((m) => (
            <SelectItem key={m} value={m} className="text-xs">
              {t(`metrics.${m}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
