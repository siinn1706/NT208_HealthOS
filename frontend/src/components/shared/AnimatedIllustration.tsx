/**
 * AnimatedIllustration
 *
 * A performance-safe wrapper for robot SVG illustrations that combines:
 *   1. Entrance animation  – fade-in-up (once, on mount, ease-out)
 *   2. Continuous float    – gentle up/down loop (GPU-composited transform only)
 *
 * Rules applied (ui-ux-pro-max):
 *   - Animations are applied to WRAPPER divs, NEVER to the <img> directly.
 *   - Only `transform` + `opacity` are animated → zero layout repaint.
 *   - `transition-all` is banned; only `transition-transform` is used.
 *   - `motion-safe:` guards every animation so users who prefer-reduced-motion
 *     see a clean, static image with no movement.
 *   - Explict `width` + `height` on the container prevents CLS.
 *   - `aria-hidden="true"` on purely decorative images.
 */

import Image from "next/image";

type Delay = "delay-0" | "delay-150" | "delay-300" | "delay-500" | "delay-700";
type FloatVariant = "normal" | "delayed";

interface AnimatedIllustrationProps {
  src: string;
  alt?: string;
  /** Pixel width of the rendered image */
  width: number;
  /** Pixel height of the rendered image */
  height: number;
  /** Prioritise above-the-fold images (sets priority + eager loading) */
  priority?: boolean;
  /** Pass-through className for the outer container */
  className?: string;
  /** Tailwind delay class for staggered entrances */
  entranceDelay?: Delay;
  /** "normal" starts float from rest; "delayed" starts mid-cycle for variety */
  floatVariant?: FloatVariant;
  /** Whether this is purely decorative (adds aria-hidden) */
  decorative?: boolean;
}

export function AnimatedIllustration({
  src,
  alt = "",
  width,
  height,
  priority = false,
  className = "",
  entranceDelay = "delay-0",
  floatVariant = "normal",
  decorative = true,
}: AnimatedIllustrationProps) {
  const floatClass =
    floatVariant === "delayed" ? "animate-float-delayed" : "animate-float";

  return (
    /* Outer: reserves space → prevents CLS */
    <div
      className={`relative select-none ${className}`}
      style={{ width, height }}
    >
      {/* Layer 1: Entrance — fade up once when page loads */}
      <div
        className={`motion-safe:animate-fade-in-up motion-safe:${entranceDelay} motion-reduce:opacity-100`}
      >
        {/* Layer 2: Float — gentle perpetual up/down (separate element for GPU layer) */}
        <div
          className={`motion-safe:${floatClass} transition-transform duration-300 ease-out motion-reduce:transform-none motion-reduce:animate-none`}
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            className="object-contain drop-shadow-2xl"
            aria-hidden={decorative ? "true" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
