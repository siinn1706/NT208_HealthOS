"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import type { ReportPeriod } from "@/types/api";

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface TimeRangeSelectorProps {
  value: ReportPeriod | "custom";
  dateFrom?: string;
  dateTo?: string;
  onChange: (range: ReportPeriod | "custom", dateFrom?: string, dateTo?: string) => void;
}

export function TimeRangeSelector({
  value,
  dateFrom,
  dateTo,
  onChange,
}: TimeRangeSelectorProps) {
  const t = useTranslations("common.timeRange");
  const PRESETS: { label: string; value: ReportPeriod }[] = [
    { label: t("days7"), value: "7d" },
    { label: t("days30"), value: "30d" },
    { label: t("days90"), value: "90d" },
  ];
  const [customOpen, setCustomOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<string>(
    dateFrom ?? ""
  );
  const [tempTo, setTempTo] = useState<string>(
    dateTo ?? ""
  );

  return (
    <div className="flex items-center gap-1">
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          variant={value === preset.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value === "custom" ? "default" : "outline"}
            size="sm"
            className="gap-1"
          >
            <CalendarIcon className="size-3" />
            {value === "custom" && dateFrom && dateTo
              ? `${formatDisplay(dateFrom)} - ${formatDisplay(dateTo)}`
              : t("custom")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="end">
          <div className="flex flex-col gap-3 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{t("fromDate")}</span>
                <input
                  type="date"
                  aria-label={t("fromDate")}
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{t("toDate")}</span>
                <input
                  type="date"
                  aria-label={t("toDate")}
                  value={tempTo}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              disabled={!tempFrom || !tempTo}
              onClick={() => {
                if (tempFrom && tempTo) {
                  onChange(
                    "custom",
                    formatDate(new Date(tempFrom)),
                    formatDate(new Date(tempTo))
                  );
                  setCustomOpen(false);
                }
              }}
            >
              {t("apply")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
