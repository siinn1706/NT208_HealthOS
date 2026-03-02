"use client";

import { useTranslations } from "next-intl";
import { X, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface DashboardAlert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
}

interface AlertBannerWidgetProps {
  alerts: DashboardAlert[];
}

const ALERT_STYLES = {
  critical: {
    wrapper: "bg-destructive/10 border-destructive/40 text-destructive",
    icon: AlertTriangle,
    iconClass: "text-destructive",
  },
  warning: {
    wrapper: "bg-[#E7DEA7]/15 border-[#E3B79A]/40 text-[#b07d2e]",
    icon: AlertTriangle,
    iconClass: "text-[#E3B79A]",
  },
  info: {
    wrapper: "bg-primary/10 border-primary/30 text-primary",
    icon: Info,
    iconClass: "text-primary",
  },
};

export function AlertBannerWidget({ alerts }: AlertBannerWidgetProps) {
  const t = useTranslations("dashboard.alerts");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set([...prev, id]));
  const dismissAll = () =>
    setDismissed(new Set(alerts.map((a) => a.id)));

  return (
    <div className="space-y-2 mb-4" role="alert" aria-live="polite">
      {visible.map((alert) => {
        const style = ALERT_STYLES[alert.type];
        const Icon = style.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium",
              style.wrapper
            )}
          >
            <Icon className={cn("w-4 h-4 flex-shrink-0", style.iconClass)} />
            <span className="flex-1">{alert.message}</span>
            <button
              className="ml-auto flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => dismiss(alert.id)}
              aria-label={t("dismiss")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      {visible.length > 1 && (
        <button
          onClick={dismissAll}
          className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer transition-colors duration-200"
        >
          {t("dismissAll")}
        </button>
      )}
    </div>
  );
}
