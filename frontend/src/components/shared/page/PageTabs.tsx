"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageTabItem {
  key: string;
  label: React.ReactNode;
  href?: string;
  count?: number;
  disabled?: boolean;
}

export interface PageTabsProps {
  items: PageTabItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function PageTabs({
  items,
  activeKey,
  onChange,
  className,
  ariaLabel = "Section navigation",
}: PageTabsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex items-end gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const itemClassName = cn(
          "relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
          item.disabled && "pointer-events-none opacity-50",
        );
        const inner = (
          <>
            <span>{item.label}</span>
            {typeof item.count === "number" && item.count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                {item.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" />
            )}
          </>
        );
        if (item.href) {
          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={itemClassName}
            >
              {inner}
            </a>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            aria-current={active ? "true" : undefined}
            onClick={() => onChange?.(item.key)}
            className={itemClassName}
          >
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
