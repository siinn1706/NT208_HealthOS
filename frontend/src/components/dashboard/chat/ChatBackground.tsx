"use client";

/**
 * ChatBackground  Telegram-style dual-layer background:
 *   Layer 1: CSS gradient (no image files, instant render)
 *   Layer 2: SVG pattern tiled over the gradient
 *              white-stroke variant on dark gradients
 *              black-stroke variant on light gradients
 *   Layer 3: Semi-transparent overlay for text readability
 *
 * theme_id format: "gradId|patId|opacity" (opacity = 0-100 integer, default 45)
 */
import { CHAT_GRADIENTS, CHAT_PATTERNS, parseThemeId, resolvePatternUrl } from "@/data/chat";

interface ChatBackgroundProps {
  themeId: string | null;
}

export function ChatBackground({ themeId }: ChatBackgroundProps) {
  const { gradId, patId, opacity } = parseThemeId(themeId);

  const gradient = CHAT_GRADIENTS.find((g) => g.id === gradId);
  const pattern  = CHAT_PATTERNS.find((p)  => p.id === patId);

  const hasGrad = !!gradient?.css;
  const hasPat  = !!pattern?.filename;

  if (!hasGrad && !hasPat) return null;

  const gradType   = gradient?.type ?? "light";
  const patternUrl = pattern ? resolvePatternUrl(pattern, gradType) : "";

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Layer 1: CSS gradient base */}
      {hasGrad && (
        <div
          className="absolute inset-0"
          style={{ background: gradient!.css }}
        />
      )}

      {/* Layer 2: SVG pattern overlay  auto-selects light/dark variant */}
      {hasPat && patternUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${patternUrl})`,
            backgroundRepeat: "repeat",
            backgroundSize: "auto",
            opacity: opacity / 100,
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Layer 3: Readability overlay */}
      <div className="absolute inset-0 bg-background/48" />
    </div>
  );
}
