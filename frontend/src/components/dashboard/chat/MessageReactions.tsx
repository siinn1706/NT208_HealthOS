"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import type { MessageReaction } from "@/types/api";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
  align?: "left" | "right";
  currentUserId: string | null;
}

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureChip(el: HTMLElement | null): AnchorRect | null {
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return {
    top: b.top,
    left: b.left,
    width: Math.max(b.width, 1),
    height: Math.max(b.height, 1),
  };
}

export function MessageReactions({
  reactions,
  onReact,
  align = "left",
  currentUserId,
}: MessageReactionsProps) {
  const t = useTranslations("chat");
  const [openEmoji, setOpenEmoji] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const chipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  /** When this changes, the open chip may have unmounted (e.g. reaction removed) — re-measure. */
  const reactionsKey = reactions.map((r) => r.emoji).join("\0");

  useLayoutEffect(() => {
    if (!openEmoji) return;
    const update = () => {
      const chip = chipRefs.current.get(openEmoji) ?? null;
      const next = measureChip(chip);
      if (next) setAnchorRect(next);
      else {
        setOpenEmoji(null);
        setAnchorRect(null);
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [openEmoji, reactionsKey]);

  if (reactions.length === 0) return null;

  const active = openEmoji ? reactions.find((r) => r.emoji === openEmoji) : null;

  return (
    <Popover
      open={openEmoji !== null}
      onOpenChange={(open) => {
        if (!open) {
          setOpenEmoji(null);
          setAnchorRect(null);
        }
      }}
    >
      <div className={cn("flex flex-wrap gap-1 mt-1", align === "right" && "justify-end")}>
        {reactions.map((r) => {
          const hasReacted = !!currentUserId && r.user_ids.includes(currentUserId);
          return (
            <div
              key={r.emoji}
              ref={(el) => {
                if (el) chipRefs.current.set(r.emoji, el);
                else chipRefs.current.delete(r.emoji);
              }}
              className={cn(
                "inline-flex items-stretch rounded-full border overflow-hidden",
                "transition-colors duration-150",
                hasReacted ? "border-primary/40 bg-primary/10" : "border-border bg-background"
              )}
            >
              <button
                type="button"
                onClick={() => onReact(r.emoji)}
                aria-label={`${r.emoji} ${r.user_ids.length}`}
                className={cn(
                  "flex items-center gap-0.5 text-xs px-2 py-0.5 cursor-pointer",
                  "hover:bg-secondary/80 transition-colors"
                )}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {r.user_ids.length}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const wrap = (e.currentTarget as HTMLElement).parentElement;
                  const rect = measureChip(wrap);
                  if (!rect) return;
                  if (openEmoji === r.emoji) {
                    setOpenEmoji(null);
                    setAnchorRect(null);
                  } else {
                    setOpenEmoji(r.emoji);
                    setAnchorRect(rect);
                  }
                }}
                aria-label={t("viewReactions")}
                aria-expanded={openEmoji === r.emoji}
                className={cn(
                  "flex items-center justify-center px-1.5 border-l border-border/60",
                  "text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors cursor-pointer"
                )}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {anchorRect && openEmoji && (
        <PopoverAnchor asChild>
          <span
            aria-hidden
            className="fixed z-40 block pointer-events-none"
            style={{
              top: anchorRect.top,
              left: anchorRect.left,
              width: anchorRect.width,
              height: anchorRect.height,
            }}
          />
        </PopoverAnchor>
      )}

      <PopoverContent side="top" align="center" className="w-auto p-2 text-xs" sideOffset={6}>
        {active && (
          <>
            <p className="font-semibold mb-1">{active.emoji}</p>
            <ul className="space-y-0.5 max-h-48 overflow-y-auto">
              {active.user_ids.map((uid) => {
                const name =
                  uid === currentUserId
                    ? t("you")
                    : uid === "ai"
                      ? t("aiAssistant")
                      : active.user_names?.[uid] ?? uid;
                return <li key={uid}>{name}</li>;
              })}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
