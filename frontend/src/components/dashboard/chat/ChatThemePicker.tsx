"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { CHAT_THEMES } from "@/data/chat";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ChatThemePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentThemeId: string | null;
  onSelect: (themeId: string | null) => void;
}

export function ChatThemePicker({
  open,
  onOpenChange,
  currentThemeId,
  onSelect,
}: ChatThemePickerProps) {
  const t = useTranslations("chat");
  const [previewId, setPreviewId] = useState<string | null | undefined>(undefined);

  const gradients = CHAT_THEMES.filter((th) => th.type === "gradient");
  const patterns = CHAT_THEMES.filter((th) => th.type === "pattern");

  // Live preview: use hover target, fallback to current selection
  const displayId = previewId !== undefined ? previewId : currentThemeId;
  const previewTheme = displayId ? CHAT_THEMES.find((th) => th.id === displayId) : null;

  function handleSelect(id: string | null) {
    onSelect(id);
    onOpenChange(false);
    setPreviewId(undefined);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setPreviewId(undefined);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border flex-shrink-0">
          <DialogTitle>{t("changeTheme")}</DialogTitle>
        </DialogHeader>

        {/* Live preview strip */}
        <div
          className="relative h-20 w-full flex-shrink-0 border-b border-border overflow-hidden transition-all duration-300"
          style={
            previewTheme
              ? previewTheme.type === "pattern"
                ? {
                    backgroundImage: `url(${previewTheme.url})`,
                    backgroundRepeat: "repeat",
                    backgroundSize: "188px 406px", // half of 375×812 for compact preview
                  }
                : {
                    backgroundImage: `url(${previewTheme.url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center top",
                  }
              : {}
          }
        >
          {previewTheme && <div className="absolute inset-0 bg-background/50" />}
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="flex items-center gap-3 max-w-full">
              <div className="px-3.5 py-2 rounded-2xl rounded-bl-sm bg-secondary/90 text-xs text-foreground backdrop-blur-sm shadow-sm">
                Xin chào! 👋 Tôi có thể giúp gì?
              </div>
              <div className="px-3.5 py-2 rounded-2xl rounded-br-sm bg-primary/90 text-xs text-primary-foreground backdrop-blur-sm shadow-sm">
                Hỏi về sức khỏe
              </div>
            </div>
          </div>
          {previewTheme && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-3 text-[10px] opacity-80 backdrop-blur-sm"
            >
              {previewTheme.name}
            </Badge>
          )}
          {!previewTheme && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              {t("themeNone")} — {t("noConversation")}
            </p>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-6">
            {/* None */}
            <div>
              <SectionLabel label={t("themeNone")} />
              <button
                onClick={() => handleSelect(null)}
                onMouseEnter={() => setPreviewId(null)}
                onMouseLeave={() => setPreviewId(undefined)}
                className={cn(
                  "w-full h-14 rounded-xl border-2 flex items-center justify-center gap-2 transition-all cursor-pointer",
                  "hover:bg-secondary",
                  currentThemeId === null
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background"
                )}
              >
                <X
                  className={cn(
                    "w-4 h-4",
                    currentThemeId === null ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-sm",
                    currentThemeId === null ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {t("themeNone")}
                </span>
                {currentThemeId === null && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center ml-auto mr-2">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            </div>

            {/* Gradients */}
            <div>
              <SectionLabel label={t("themeGradients")} count={gradients.length} />
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {gradients.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isSelected={currentThemeId === theme.id}
                    onHover={() => setPreviewId(theme.id)}
                    onLeave={() => setPreviewId(undefined)}
                    onSelect={() => handleSelect(theme.id)}
                  />
                ))}
              </div>
            </div>

            {/* Patterns */}
            <div>
              <SectionLabel label={t("themePatterns")} count={patterns.length} />
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {patterns.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isSelected={currentThemeId === theme.id}
                    onHover={() => setPreviewId(theme.id)}
                    onLeave={() => setPreviewId(undefined)}
                    onSelect={() => handleSelect(theme.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      {count !== undefined && (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{count}</Badge>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  isSelected,
  onHover,
  onLeave,
  onSelect,
}: {
  theme: { id: string; name: string; url: string };
  isSelected: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        "relative rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer group",
        "aspect-[4/3] hover:scale-[1.06] hover:shadow-lg",
        isSelected
          ? "border-primary shadow-md shadow-primary/30 scale-[1.03]"
          : "border-transparent hover:border-primary/40"
      )}
    >
      <Image
        src={theme.url}
        alt={theme.name}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 25vw, 140px"
        unoptimized
      />

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 flex items-end justify-end p-1.5">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      )}

      {/* Hover name label */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-[10px] text-white font-medium truncate leading-tight">{theme.name}</p>
      </div>
    </button>
  );
}


