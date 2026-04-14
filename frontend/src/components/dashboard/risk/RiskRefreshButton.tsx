"use client";

import { useState } from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RiskRefreshButton() {
  const t = useTranslations("dashboard.risk");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch("/api/v1/health/risk-predictions", { method: "POST" });
    } catch {
      // ignore — router.refresh() still reloads the latest stored data
    } finally {
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-card",
        "text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer self-start",
        loading && "opacity-60 cursor-not-allowed"
      )}
      aria-label={t("updateAria")}
    >
      <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
      {t("update")}
    </button>
  );
}
