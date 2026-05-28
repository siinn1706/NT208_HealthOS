"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AtmosphereGridVariant = "lines" | "dots";
type AtmosphereGridTone = "auto" | "dark" | "light";

interface AtmosphereGridProps {
  className?: string;
  /** `lines` (default) keeps the existing 1px crosshatch grid. `dots` matches the SePay reference. */
  variant?: AtmosphereGridVariant;
  /**
   * Surface tone the grid sits on:
   * - `auto` (default) → uses Tailwind `dark:` to flip dark-on-light vs light-on-dark
   * - `dark` → forces light pattern on a dark surface (use on `tone="dark"` Sections)
   * - `light` → forces dark pattern on a light surface
   */
  tone?: AtmosphereGridTone;
  /**
   * When true, a soft spotlight mask follows the user's cursor so the dot
   * pattern brightens around the pointer. Falls back to a static center
   * spotlight on touch devices and respects `prefers-reduced-motion`.
   */
  interactive?: boolean;
  /** Spotlight radius in pixels (default 360). */
  spotlightRadius?: number;
}

const LINES_LIGHT_ON_DARK =
  "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)";
const LINES_DARK_ON_LIGHT =
  "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)";
const LINES_SIZE = "48px 48px";

const DOTS_LIGHT_ON_DARK =
  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.10) 1px, transparent 1.5px)";
const DOTS_DARK_ON_LIGHT =
  "radial-gradient(circle at 1px 1px, rgba(15,39,67,0.10) 1px, transparent 1.5px)";

// Brighter dots used for the interactive spotlight layer
const DOTS_LIGHT_ON_DARK_BRIGHT =
  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 1.5px)";
const DOTS_DARK_ON_LIGHT_BRIGHT =
  "radial-gradient(circle at 1px 1px, rgba(15,39,67,0.40) 1px, transparent 1.5px)";

const DOTS_SIZE = "24px 24px";

const autoLinesClasses = cn(
  "[background-image:linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)]",
  "dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]",
  "[background-size:48px_48px]",
);

const autoDotsClasses = cn(
  "[background-image:radial-gradient(circle_at_1px_1px,rgba(15,39,67,0.10)_1px,transparent_1.5px)]",
  "dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.10)_1px,transparent_1.5px)]",
  "[background-size:24px_24px]",
);

const autoDotsBrightClasses = cn(
  "[background-image:radial-gradient(circle_at_1px_1px,rgba(15,39,67,0.40)_1px,transparent_1.5px)]",
  "dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.45)_1px,transparent_1.5px)]",
  "[background-size:24px_24px]",
);

/**
 * Subtle line or dot grid layered behind hero content.
 * - Lines: 48px cell, 1px strokes; dots: 24px cell, radial dots
 * - Radial mask fades grid toward edges so it dissolves behind copy
 * - Hidden below `sm` to keep mobile perf high
 * - Decorative only (aria-hidden, pointer-events-none)
 *
 * Pass `interactive` to add a cursor-following spotlight that brightens the
 * dot pattern around the pointer. Best used with `variant="dots"`.
 *
 * Designed to be the first child of a `relative overflow-hidden` hero `<section>`.
 */
export function AtmosphereGrid({
  className,
  variant = "lines",
  tone = "auto",
  interactive = false,
  spotlightRadius = 360,
}: AtmosphereGridProps) {
  const explicitTone = tone === "dark" || tone === "light";
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Mouse tracking: update CSS vars on the parent <section> so the spotlight
  // mask follows the cursor without re-rendering React.
  useEffect(() => {
    if (!interactive) return;
    const el = spotlightRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    // Respect reduced-motion: skip cursor tracking, keep static center glow.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let frame = 0;
    let pendingX = 0;
    let pendingY = 0;
    let hasPending = false;

    const apply = () => {
      frame = 0;
      if (!hasPending) return;
      hasPending = false;
      el.style.setProperty("--mx", `${pendingX}px`);
      el.style.setProperty("--my", `${pendingY}px`);
      el.style.setProperty("--spot-opacity", "1");
    };

    const handleMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      pendingX = e.clientX - rect.left;
      pendingY = e.clientY - rect.top;
      hasPending = true;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const handleLeave = () => {
      el.style.setProperty("--spot-opacity", "0");
    };

    parent.addEventListener("pointermove", handleMove);
    parent.addEventListener("pointerleave", handleLeave);
    return () => {
      parent.removeEventListener("pointermove", handleMove);
      parent.removeEventListener("pointerleave", handleLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [interactive]);

  const bgImage =
    variant === "dots"
      ? tone === "dark"
        ? DOTS_LIGHT_ON_DARK
        : tone === "light"
          ? DOTS_DARK_ON_LIGHT
          : undefined
      : tone === "dark"
        ? LINES_LIGHT_ON_DARK
        : tone === "light"
          ? LINES_DARK_ON_LIGHT
          : undefined;

  const bgSize = variant === "dots" ? DOTS_SIZE : LINES_SIZE;

  // Bright variant of the dot pattern used for the interactive spotlight layer
  const spotlightImage =
    tone === "dark"
      ? DOTS_LIGHT_ON_DARK_BRIGHT
      : tone === "light"
        ? DOTS_DARK_ON_LIGHT_BRIGHT
        : undefined;

  return (
    <>
      <div
        aria-hidden="true"
        style={
          explicitTone && bgImage
            ? { backgroundImage: bgImage, backgroundSize: bgSize }
            : undefined
        }
        className={cn(
          "pointer-events-none absolute inset-0 hidden sm:block",
          tone === "auto" && (variant === "dots" ? autoDotsClasses : autoLinesClasses),
          "[mask-image:radial-gradient(ellipse_at_50%_30%,black_0%,transparent_70%)]",
          "[-webkit-mask-image:radial-gradient(ellipse_at_50%_30%,black_0%,transparent_70%)]",
          className,
        )}
      />
      {interactive && variant === "dots" && (
        <div
          ref={spotlightRef}
          aria-hidden="true"
          style={{
            ...(explicitTone && spotlightImage
              ? { backgroundImage: spotlightImage, backgroundSize: bgSize }
              : {}),
            // Defaults so the layer is invisible until first pointer move
            ["--mx" as string]: "50%",
            ["--my" as string]: "50%",
            ["--spot-opacity" as string]: "0",
            ["--spot-radius" as string]: `${spotlightRadius}px`,
            opacity: "var(--spot-opacity)",
            WebkitMaskImage:
              "radial-gradient(circle var(--spot-radius) at var(--mx) var(--my), black 0%, transparent 70%)",
            maskImage:
              "radial-gradient(circle var(--spot-radius) at var(--mx) var(--my), black 0%, transparent 70%)",
            transition: "opacity 200ms ease-out",
          }}
          className={cn(
            "pointer-events-none absolute inset-0 hidden sm:block",
            tone === "auto" && autoDotsBrightClasses,
          )}
        />
      )}
    </>
  );
}
