"use client";

import { useTranslations } from "next-intl";

export function TypingIndicator() {
  const t = useTranslations("chat");
  return (
    <div
      aria-live="polite"
      aria-label={t("typingAria")}
      className="flex items-end gap-1 px-4 py-2"
    >
      <div className="flex items-center gap-1 bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 bg-primary/60 rounded-full inline-block animate-pulse"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}
