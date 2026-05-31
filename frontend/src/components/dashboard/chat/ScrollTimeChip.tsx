"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { cn } from "@/lib/utils";

function formatRelativeDate(
  date: Date,
  locale: string,
  labels: { today: string; yesterday: string }
): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);

  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

interface ScrollTimeChipProps {
  visible: boolean;
  date: Date | null;
  onClick: () => void;
}

export function ScrollTimeChip({ visible, date, onClick }: ScrollTimeChipProps) {
  const locale = useLocale();
  const t = useTranslations("chat");
  const label = date
    ? formatRelativeDate(date, locale, { today: t("today"), yesterday: t("yesterday") })
    : null;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {visible && label && (
          <m.button
            initial={{ opacity: 0, y: -6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.92 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={onClick}
            aria-label={t("jumpToDateAria", { label })}
            className={cn(
              "absolute top-2 left-1/2 -translate-x-1/2 z-30",
              "flex items-center gap-1.5 pl-3 pr-1.5 py-1",
              "bg-secondary/90 dark:bg-slate-800/90 backdrop-blur-sm border border-border rounded-full shadow-md",
              "text-xs font-medium text-foreground cursor-pointer",
              "hover:bg-secondary transition-colors"
            )}
          >
            <CalendarDays className="size-3 text-primary flex-shrink-0" />
            <span>{label}</span>
            <CalendarDays className="size-3 text-muted-foreground/60" />
          </m.button>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
