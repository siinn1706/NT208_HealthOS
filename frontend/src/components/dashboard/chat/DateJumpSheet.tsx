"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { vi as viLocale } from "date-fns/locale/vi";
import { enUS as enLocale } from "date-fns/locale/en-US";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import type { Message } from "@/types/api";

interface DateJumpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  onJumpToDate: (date: Date) => Promise<boolean> | boolean;
  onJumpToLatest: () => void;
  /** Month to focus when opening the calendar (defaults to last message's month). */
  initialMonth?: Date | null;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function DateJumpSheet({
  open,
  onOpenChange,
  messages,
  onJumpToDate,
  onJumpToLatest,
  initialMonth,
}: DateJumpSheetProps) {
  const locale = useLocale();
  const t = useTranslations("chat");
  const [isJumping, setIsJumping] = useState(false);
  const [monthState, setMonthState] = useState<{ focusedTime: number; month: Date }>(() => {
    const initial = initialMonth ?? new Date();
    return { focusedTime: initial.getTime(), month: initial };
  });
  const [feedbackState, setFeedbackState] = useState<{ open: boolean; message: string | null }>({
    open,
    message: null,
  });

  const datesWithMessages = useMemo(() => {
    const withMessages = new Set<string>();
    for (let i = 0; i < messages.length; i++) {
      withMessages.add(dateKey(new Date(messages[i].created_at)));
    }
    return withMessages;
  }, [messages]);

  const focusedMonth = useMemo(() => {
    if (initialMonth) return initialMonth;
    if (messages.length > 0) return new Date(messages[messages.length - 1].created_at);
    return new Date();
  }, [initialMonth, messages]);

  const focusedMonthTime = focusedMonth.getTime();
  const month = open && monthState.focusedTime === focusedMonthTime ? monthState.month : focusedMonth;
  const feedback = feedbackState.open === open ? feedbackState.message : null;

  const dfLocale = locale === "vi" ? viLocale : enLocale;

  const setFeedback = (message: string | null) => {
    setFeedbackState({ open, message });
  };

  const handleMonthChange = (nextMonth: Date) => {
    setMonthState({ focusedTime: focusedMonthTime, month: nextMonth });
  };

  const handleSelect = async (date: Date | undefined) => {
    if (!date || isJumping) return;
    setFeedback(null);
    setIsJumping(true);
    try {
      const didJump = await onJumpToDate(date);
      if (didJump) {
        onOpenChange(false);
      } else {
        setFeedback(t("dateJumpNotFound"));
      }
    } finally {
      setIsJumping(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFeedback(null);
    onOpenChange(nextOpen);
  };

  const handleJumpToLatestClick = () => {
    setFeedback(null);
    onJumpToLatest();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-center text-base">{t("dateJumpTitle")}</SheetTitle>
        </SheetHeader>

        <div className="px-2 pt-2 pb-1">
          <button
            type="button"
            onClick={handleJumpToLatestClick}
            disabled={messages.length === 0 || isJumping}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left disabled:opacity-50 disabled:pointer-events-none"
          >
            <CalendarDays className="size-5 text-primary flex-shrink-0" />
            <div>
              <div className="text-sm font-medium">{t("today")}</div>
              <div className="text-xs text-muted-foreground">{t("dateJumpTodaySubtitle")}</div>
            </div>
          </button>
        </div>

        <div className="border-t border-border my-1" />

        <div className="flex flex-col items-center overflow-y-auto px-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("dateJumpNoMessages")}
            </p>
          ) : (
            <>
              <Calendar
                mode="single"
                month={month}
                onMonthChange={handleMonthChange}
                onSelect={(date) => {
                  void handleSelect(date);
                }}
                locale={dfLocale}
                modifiers={{ hasMessages: (d) => datesWithMessages.has(dateKey(d)) }}
                modifiersClassNames={{
                  hasMessages: "font-semibold text-foreground",
                }}
              />
              {feedback ? <p className="px-3 pb-2 text-sm text-muted-foreground">{feedback}</p> : null}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
