"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { TrendAnalysis } from "@/types/api";

interface TrendExportBarProps {
  analysis: TrendAnalysis;
}

export function TrendExportBar({ analysis }: TrendExportBarProps) {
  const t = useTranslations("trends");

  function handleExportCsv() {
    const rows = [
      ["Date", `${analysis.metric_label} (${analysis.unit})`, "Trend Line"],
      ...analysis.data_points.map((p, i) => [
        p.date,
        p.value.toString(),
        (analysis.trend_line[i] ?? "").toString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trend-${analysis.metric}-${analysis.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải xuống file CSV");
  }

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: `Phân tích xu hướng: ${analysis.metric_label}`,
          text: analysis.ai_summary,
        })
        .catch(() => { /* dismissed */ });
    } else {
      navigator.clipboard.writeText(analysis.ai_summary).then(() =>
        toast.success("Đã sao chép tóm tắt vào clipboard")
      );
    }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleShare}>
        <Share2 className="size-4" aria-hidden />
        {t("export")}
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCsv}>
        <Download className="size-4" aria-hidden />
        CSV
      </Button>
    </div>
  );
}
