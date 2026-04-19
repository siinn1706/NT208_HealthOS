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

/**
 * Subtle line or dot grid layered behind hero content.
 * - Lines: 48px cell, 1px strokes; dots: 24px cell, radial dots
 * - Radial mask fades grid toward edges so it dissolves behind copy
 * - Hidden below `sm` to keep mobile perf high
 * - Decorative only (aria-hidden, pointer-events-none)
 *
 * On dark-gradient heroes that ignore global theme, pass `tone="dark"` so the
 * pattern stays visible in light theme (`.dark` alone does not apply there).
 *
 * Designed to be the first child of a `relative overflow-hidden` hero `<section>`.
 */
export function AtmosphereGrid({
  className,
  variant = "lines",
  tone = "auto",
}: AtmosphereGridProps) {
  const explicitTone = tone === "dark" || tone === "light";

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

  return (
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
  );
}
