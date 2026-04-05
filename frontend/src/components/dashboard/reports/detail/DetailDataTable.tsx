"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TimeseriesPoint } from "@/types/api";
import { getLocaleTag } from "@/lib/format-utils";

interface DetailDataTableProps {
  data: TimeseriesPoint[];
  unit: string;
  hasSecondary?: boolean;
  secondaryLabel?: string;
}

const PAGE_SIZE = 10;

export function DetailDataTable({
  data,
  unit,
  hasSecondary = false,
  secondaryLabel = "Giá trị 2",
}: DetailDataTableProps) {
  const t = useTranslations("reports.detail");
  const locale = useLocale();
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const slice = data.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{t("dataTable")}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{t("date")}</th>
              <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">
                {t("value")} ({unit})
              </th>
              {hasSecondary && (
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">
                  {secondaryLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.date} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.date}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                  {row.value.toLocaleString(getLocaleTag(locale))}
                </td>
                {hasSecondary && (
                  <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                    {row.value2?.toLocaleString(getLocaleTag(locale)) ?? "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border">
          <span className="text-[11px] text-muted-foreground">
            Trang {page + 1} / {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Trang tiếp"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
