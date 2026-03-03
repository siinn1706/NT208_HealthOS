"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "@/navigation";
import { Download, Share2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportQuickActionsProps {
  locale: string;
  reportId: string;
  onExportPdf?: () => void;
  onShare?: () => void;
}

export function ReportQuickActions({
  locale,
  reportId,
  onExportPdf,
  onShare,
}: ReportQuickActionsProps) {
  const t = useTranslations("reports");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs"
        onClick={onExportPdf}
        aria-label={t("exportPdf")}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {t("exportPdf")}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs"
        onClick={onShare}
        aria-label={t("shareReport")}
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        {t("shareReport")}
      </Button>

      <Button asChild variant="default" size="sm" className="gap-2 text-xs">
        <Link href={`/${locale}/dashboard/reports/trends`}>
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          {t("analyzeTrends")}
        </Link>
      </Button>
    </div>
  );
}
