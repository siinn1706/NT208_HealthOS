"use client";

/**
 * ChatBackground  Telegram-style three-layer background:
 *   Layer 1: TWallpaper animated canvas gradient (falls back to CSS gradient
 *            when gradId has no TWallpaper color entry, or when reduced motion)
 *   Layer 2: SVG pattern tiled over the gradient
 *              white-stroke variant on dark gradients
 *              black-stroke variant on light gradients
 *   Layer 3: Semi-transparent overlay for text readability
 *
 * theme_id format: "gradId|patId|opacity" (opacity = 0-100 integer, default 45)
 */
import dynamic from "next/dynamic";

// TWallpaper uses canvas/DOM APIs — must be client-only (no SSR)
const TWallpaper = dynamic(
  () => import("@twallpaper/react").then((m) => ({ default: m.TWallpaper })),
  { ssr: false }
);

import { CHAT_GRADIENTS, CHAT_PATTERNS, TWALLPAPER_COLORS, parseThemeId, resolvePatternUrl } from "@/data/chat";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ChatBackgroundProps {
  themeId: string | null;
}

export function ChatBackground({ themeId }: ChatBackgroundProps) {
  const { gradId, patId, opacity } = parseThemeId(themeId);
  const prefersReduced = useReducedMotion();
  const isTouchDevice =
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  const gradient = CHAT_GRADIENTS.find((g) => g.id === gradId);
  const pattern  = CHAT_PATTERNS.find((p)  => p.id === patId);

  const hasGrad = !!gradient?.css;
  const hasPat  = !!pattern?.filename;

  if (!hasGrad && !hasPat) return null;

  const gradType    = gradient?.type ?? "light";
  const patternUrl  = pattern ? resolvePatternUrl(pattern, gradType) : "";
  const wpEntry     = TWALLPAPER_COLORS[gradId];

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Layer 1: Animated TWallpaper canvas, or CSS gradient fallback */}
      {hasGrad && (
        <div className="absolute inset-0">
          {wpEntry ? (
            <TWallpaper
              key={gradId}
              options={{
                colors: wpEntry.colors,
                fps: prefersReduced ? 0 : isTouchDevice ? 15 : 30,
                tails: wpEntry.tails ?? 90,
                animate: !prefersReduced,
                scrollAnimate: false,
              }}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: gradient!.css }} />
          )}
        </div>
      )}

      {/* Layer 2: SVG pattern overlay — auto-selects light/dark variant */}
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
