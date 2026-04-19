import { cn } from "@/lib/utils";

type GlowVariant = "default" | "soft";

interface AtmosphereGlowProps {
  className?: string;
  /**
   * - `default` → twin warm + cool blooms (~18%/16%) for the homepage hero.
   * - `soft`    → single low-intensity bloom (~12%) for inner-page heroes
   *                where calmer ambience is desired (About, Articles).
   */
  variant?: GlowVariant;
  /**
   * When true, the ambient drift animation is skipped even on `sm+` devices.
   * Use on inner-page heroes where calmer ambience is desired.
   */
  static?: boolean;
}

/**
 * Glow background-image styles — use CSS custom properties so the bloom
 * colour tracks the Night Sky palette tokens (`--color-warm-peach`,
 * `--color-night-400`) and follows theme changes without a rebuild.
 * `color-mix(in srgb, …)` controls opacity inline, avoiding a separate
 * rgba() literal that would fall out of sync if palette tokens change.
 */
const VARIANT_STYLE: Record<GlowVariant, React.CSSProperties> = {
  default: {
    backgroundImage: [
      "radial-gradient(ellipse 600px 400px at 80% 20%, color-mix(in srgb, var(--color-warm-peach) 18%, transparent), transparent 60%)",
      "radial-gradient(ellipse 700px 500px at 15% 80%, color-mix(in srgb, var(--color-night-400) 16%, transparent), transparent 60%)",
    ].join(", "),
  },
  soft: {
    backgroundImage:
      "radial-gradient(ellipse 500px 360px at 75% 25%, color-mix(in srgb, var(--color-warm-peach) 12%, transparent), transparent 60%)",
  },
};

/**
 * Soft radial bloom layer behind hero content.
 * - Each bloom opacity ≤ 18% at brightest pixel (master plan E.4 budget)
 * - Slow ambient drift via `glow-drift` keyframes (defined in globals.css)
 * - `motion-safe:` gates animation; `prefers-reduced-motion` halts it (also enforced globally)
 * - Light-mode: wrapper runs at 60% opacity for a subtler feel on light
 *   surfaces; dark-mode restores full intensity via `dark:opacity-100`.
 * - Decorative only (aria-hidden, pointer-events-none)
 *
 * Stack order: place AFTER AtmosphereGrid and BEFORE remaining nebula blobs.
 */
export function AtmosphereGlow({
  className,
  variant = "default",
  static: isStatic = false,
}: AtmosphereGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0",
        "opacity-60 dark:opacity-100",
        !isStatic && "motion-safe:sm:animate-glow-drift",
        className
      )}
      style={VARIANT_STYLE[variant]}
    />
  );
}
