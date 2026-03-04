"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import {
  CHAT_GRADIENTS,
  CHAT_PATTERNS,
  parseThemeId,
  buildThemeId,
  resolvePatternUrl,
} from "@/data/chat";
import type { ChatGradient, ChatPattern } from "@/types/api";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Thumbnail helpers ───────────────────────────────────────────────────────
/**
 * Returns the small WebP thumbnail URL for a pattern filename.
 * e.g. "Theme_Cats.svg" → "/resources/chat/patterns/thumbs/Theme_Cats.webp"
 * Falls back to the full light SVG if no thumb exists (captured by onError).
 */
function thumbUrl(filename: string): string {
  if (!filename) return "";
  const name = filename.replace(/\.svg$/i, "");
  return `/resources/chat/patterns/thumbs/${encodeURIComponent(name)}.webp`;
}

// Module-level cache so we never preload the same URL twice across re-renders
const preloadedUrls = new Set<string>();

/**
 * Preloads a full SVG into browser cache using a hidden Image element.
 * Silently ignores failures (optional resource).
 */
function preloadUrl(url: string): void {
  if (!url || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  const img = new Image();
  img.src = url;
}

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

  const { gradId: currentGradId, patId: currentPatId, opacity: initialOpacity } =
    parseThemeId(currentThemeId);

  const [hoverGradId, setHoverGradId] = useState<string | undefined>(undefined);
  const [hoverPatId,  setHoverPatId]  = useState<string | undefined>(undefined);
  const [opacity, setOpacity]         = useState(initialOpacity);

  // Sync opacity each time the dialog is freshly opened
  // Also eagerly preload the active pattern so the preview strip loads fast
  useEffect(() => {
    if (open) {
      setOpacity(parseThemeId(currentThemeId).opacity);
      if (previewPat?.filename) {
        preloadUrl(resolvePatternUrl(previewPat, currentGradType));
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayGradId = hoverGradId !== undefined ? hoverGradId : currentGradId;
  const displayPatId  = hoverPatId  !== undefined ? hoverPatId  : currentPatId;

  const previewGrad = CHAT_GRADIENTS.find((g) => g.id === displayGradId);
  const previewPat  = CHAT_PATTERNS.find((p)  => p.id === displayPatId);

  // Gradient type drives the SVG variant (light/dark) everywhere
  const currentGradType = CHAT_GRADIENTS.find((g) => g.id === currentGradId)?.type ?? "light";
  const previewGradType = previewGrad?.type ?? "light";
  const previewPatUrl   = previewPat?.filename
    ? resolvePatternUrl(previewPat, previewGradType)
    : "";

  // Base gradient css for pattern thumbnail cards
  const thumbGradCss =
    CHAT_GRADIENTS.find((g) => g.id === currentGradId)?.css ||
    CHAT_GRADIENTS[1].css;

  function handleOpenChange(v: boolean) {
    onOpenChange(v);
    if (!v) { setHoverGradId(undefined); setHoverPatId(undefined); }
  }

  function handleGradClick(gradId: string) {
    onSelect(buildThemeId(gradId, currentPatId, opacity));
  }

  function handlePatClick(patId: string) {
    onSelect(buildThemeId(currentGradId, patId, opacity));
  }

  function handleOpacityChange(val: number) {
    setOpacity(val);
    onSelect(buildThemeId(currentGradId, currentPatId, val));
  }

  const hasPreview = !!(previewGrad?.css || previewPat?.filename);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border flex-shrink-0">
          <DialogTitle>{t("changeTheme")}</DialogTitle>
          <DialogDescription className="sr-only">{t("changeTheme")}</DialogDescription>
        </DialogHeader>

        {/* ── Live preview strip ── */}
        <div className="relative h-[88px] w-full flex-shrink-0 border-b border-border overflow-hidden">
          {previewGrad?.css && (
            <div className="absolute inset-0" style={{ background: previewGrad.css }} />
          )}
          {previewPat?.filename && previewPatUrl && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${previewPatUrl})`,
                backgroundRepeat: "repeat",
                backgroundSize: "auto",
                opacity: opacity / 100,
                mixBlendMode: "overlay",
              }}
            />
          )}
          {hasPreview && <div className="absolute inset-0 bg-background/45" />}
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-2xl rounded-bl-sm bg-secondary/90 text-xs text-foreground backdrop-blur-sm shadow-sm">
                Xin chào! 👋 Tôi có thể giúp gì?
              </div>
              <div className="px-3.5 py-2 rounded-2xl rounded-br-sm bg-primary/90 text-xs text-primary-foreground backdrop-blur-sm shadow-sm">
                Hỏi về sức khỏe
              </div>
            </div>
          </div>
          {hasPreview ? (
            <Badge variant="secondary" className="absolute top-2 right-3 text-[10px] opacity-80 backdrop-blur-sm">
              {[previewGrad?.css ? previewGrad.name : null, previewPat?.filename ? previewPat.name : null]
                .filter(Boolean).join(" + ")}
            </Badge>
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              {t("themeNone")}
            </p>
          )}
        </div>

        {/* ── Opacity slider (sticky below preview, above gradients) ── */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-fit">
              {t("themeOpacity")}
            </span>
            <span className="text-xs text-muted-foreground">0</span>
            <Slider
              value={[opacity]}
              min={0}
              max={100}
              step={5}
              onValueChange={([val]) => handleOpacityChange(val)}
              className="flex-1"
              disabled={!hasPreview}
            />
            <span className="text-xs text-muted-foreground">100</span>
            <Badge variant="secondary" className="text-xs h-5 px-2 min-w-[3rem] justify-center">
              {opacity}%
            </Badge>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-scroll pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="px-6 pt-4 pb-6 space-y-6">

            {/* ── Gradient swatches (wrap, not scroll) ── */}
            <div>
              <SectionLabel label={t("themeGradients")} count={CHAT_GRADIENTS.length - 1} />
              <div className="flex flex-wrap gap-2.5">
                {CHAT_GRADIENTS.map((grad) => (
                  <GradientSwatch
                    key={grad.id}
                    grad={grad}
                    isSelected={currentGradId === grad.id}
                    onHover={() => setHoverGradId(grad.id)}
                    onLeave={() => setHoverGradId(undefined)}
                    onSelect={() => handleGradClick(grad.id)}
                  />
                ))}
              </div>
            </div>

            {/* ── Pattern grid ── */}
            <div>
              <SectionLabel label={t("themePatterns")} count={CHAT_PATTERNS.length - 1} />
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {CHAT_PATTERNS.map((pat) => (
                  <PatternCard
                    key={pat.id}
                    pat={pat}
                    baseGradCss={thumbGradCss}
                    baseGradType={currentGradType}
                    isSelected={currentPatId === pat.id}
                    onHover={() => setHoverPatId(pat.id)}
                    onLeave={() => setHoverPatId(undefined)}
                    onSelect={() => handlePatClick(pat.id)}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
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

function GradientSwatch({
  grad, isSelected, onHover, onLeave, onSelect,
}: {
  grad: ChatGradient;
  isSelected: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const isNone = grad.id === "none";
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      title={grad.name}
      className={cn(
        "relative w-11 h-11 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
        "transition-[transform,box-shadow] duration-150 ease-out cursor-pointer motion-safe:hover:scale-110 hover:shadow-md",
        isSelected
          ? "border-primary shadow-sm shadow-primary/40 scale-105"
          : "border-border bg-background hover:border-primary/40"
      )}
      style={!isNone ? { background: grad.css } : {}}
    >
      {isNone && (
        <X className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
      )}
      {isSelected && !isNone && (
        <div className="absolute inset-0 rounded-full flex items-end justify-end p-0.5">
          <div className="w-4 h-4 rounded-full bg-primary border-2 border-white flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}
    </button>
  );
}

function PatternCard({
  pat, baseGradCss, baseGradType, isSelected, onHover, onLeave, onSelect,
}: {
  pat: ChatPattern;
  baseGradCss: string;
  baseGradType: "light" | "dark";
  isSelected: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const isNone      = pat.id === "none";
  const thumb       = pat.filename ? thumbUrl(pat.filename) : "";
  const fullUrl     = pat.filename ? resolvePatternUrl(pat, baseGradType) : "";

  // true once the full SVG has been preloaded into browser cache
  const [fullReady, setFullReady] = useState(() => preloadedUrls.has(fullUrl));
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When selected, immediately preload (if not done already)
  useEffect(() => {
    if (isSelected && fullUrl && !preloadedUrls.has(fullUrl)) {
      preloadedUrls.add(fullUrl);
      const img = new Image();
      img.onload = () => setFullReady(true);
      img.src = fullUrl;
    }
  }, [isSelected, fullUrl]);

  const handleMouseEnter = useCallback(() => {
    onHover();
    if (!fullUrl || fullReady) return;
    hoverTimerRef.current = setTimeout(() => {
      preloadedUrls.add(fullUrl);
      const img = new Image();
      img.onload = () => setFullReady(true);
      img.src = fullUrl;
    }, 200);
  }, [onHover, fullUrl, fullReady]);

  const handleMouseLeave = useCallback(() => {
    onLeave();
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, [onLeave]);

  // Use full SVG once it's cached, otherwise the thumb
  const bgUrl = fullReady ? fullUrl : thumb;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative rounded-xl overflow-hidden border-2 transition-[transform,box-shadow,border-color] duration-150 ease-out cursor-pointer group",
        "aspect-[4/3] motion-safe:hover:scale-[1.06] hover:shadow-lg",
        isSelected
          ? "border-primary shadow-md shadow-primary/30 scale-[1.03]"
          : "border-border hover:border-primary/40"
      )}
    >
      {/* Gradient base layer */}
      <div className="absolute inset-0" style={{ background: baseGradCss }} />

      {isNone ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <X className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground/70")} />
        </div>
      ) : bgUrl ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundRepeat: "repeat",
            backgroundSize: "120px auto",
            opacity: 0.45,
            mixBlendMode: "overlay",
          }}
        />
      ) : null}

      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 flex items-end justify-end p-1.5">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-[10px] text-white font-medium truncate leading-tight">{pat.name}</p>
      </div>
    </button>
  );
}
