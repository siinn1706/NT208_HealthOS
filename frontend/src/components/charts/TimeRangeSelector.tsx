"use client";

import { useState } from "react";
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

const PRESETS: { label: string; value: ReportPeriod }[] = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
];

export function TimeRangeSelector({
  value,
  dateFrom,
  dateTo,
  onChange,
}: TimeRangeSelectorProps) {
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
            <CalendarIcon className="h-3 w-3" />
            {value === "custom" && dateFrom && dateTo
              ? `${formatDisplay(dateFrom)} - ${formatDisplay(dateTo)}`
              : "Tùy chỉnh"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="end">
          <div className="flex flex-col gap-3 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Từ ngày</span>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Đến ngày</span>
                <input
                  type="date"
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
              Áp dụng
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
