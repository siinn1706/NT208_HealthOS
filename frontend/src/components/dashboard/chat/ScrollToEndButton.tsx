"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollToEndButtonProps {
  visible: boolean;
  onClick: () => void;
  /** New messages received while scrolled up */
  pendingCount?: number;
}

export function ScrollToEndButton({ visible, onClick, pendingCount = 0 }: ScrollToEndButtonProps) {
  const t = useTranslations("chat");

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-to-end"
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          type="button"
          onClick={onClick}
          aria-label={t("scrollToBottom")}
          className={cn(
            "absolute bottom-4 left-1/2 -translate-x-1/2 z-30",
            "flex items-center gap-2 px-4 py-2",
            "bg-primary text-primary-foreground rounded-full shadow-lg",
            "text-sm font-medium cursor-pointer",
            "hover:bg-primary/90 transition-colors"
          )}
        >
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
          <span>{t("scrollToBottom")}</span>
          {pendingCount > 0 && (
            <span
              className="min-w-[1.25rem] h-5 px-1 rounded-full bg-background text-primary text-xs font-bold flex items-center justify-center"
              aria-label={t("newMessagesBadge", { count: pendingCount })}
            >
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
