"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, FilePen, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisitBriefStatus } from "@/types/api";

const CONFIG: Record<
  VisitBriefStatus,
  { icon: typeof CheckCircle2; color: string; bg: string }
> = {
  draft: {
    icon: FilePen,
    color: "text-info",
    bg: "bg-info/10",
  },
  finalized: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
  },
  archived: {
    icon: Archive,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

interface Props {
  status: VisitBriefStatus;
  className?: string;
}

export function BriefStatusBadge({ status, className }: Props) {
  const t = useTranslations("dashboard.visitPrep.status");
  const cfg = CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        cfg.bg,
        cfg.color,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {t(status)}
    </span>
  );
}
