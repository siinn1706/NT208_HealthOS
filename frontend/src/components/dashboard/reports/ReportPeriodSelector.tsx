"use client";

import { useRouter, usePathname } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import type { ReportPeriod } from "@/types/api";

const PERIODS: ReportPeriod[] = ["7d", "30d", "90d"];

interface ReportPeriodSelectorProps {
  value: ReportPeriod;
}

export function ReportPeriodSelector({ value }: ReportPeriodSelectorProps) {
  const t = useTranslations("reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(period: ReportPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={value} onValueChange={(v) => handleChange(v as ReportPeriod)}>
      <TabsList className="h-9">
        {PERIODS.map((p) => (
          <TabsTrigger key={p} value={p} className="text-xs px-3">
            {t(`period${p.replace("d", "D")}` as Parameters<typeof t>[0])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
