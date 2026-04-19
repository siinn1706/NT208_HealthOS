import { cn } from "@/lib/utils";

type SectionTone = "default" | "muted" | "dark";
type SectionPadding = "none" | "sm" | "md" | "lg";
type SectionOverflow = "hidden" | "visible";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Background tone:
   * - `default` → `bg-background`
   * - `muted`   → `bg-card` (alternating beat for content sections)
   * - `dark`    → `bg-gradient-to-br from-night-900 via-night-800 to-night-900` + white text
   */
  tone?: SectionTone;
  /**
   * Vertical padding:
   * - `none` → no padding
   * - `sm`   → `py-10 md:py-14`
   * - `md`   → `py-16 md:py-24`
   * - `lg`   → `py-20 md:py-28` (hero rhythm)
   */
  padding?: SectionPadding;
  /**
   * When true (default), wraps children in a `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` container.
   * Set to false when the caller renders its own constrained inner container
   * (e.g. heroes that need a `relative` wrapper around atmosphere layers + content).
   */
  contained?: boolean;
  /**
   * Section-level overflow control. Defaults to `hidden` so atmosphere blobs/glows
   * do not bleed past the section edge. Set to `visible` for sections containing
   * sticky children whose ancestors must not clip them.
   */
  overflow?: SectionOverflow;
  /**
   * Optional override for the inner container className.
   * Has no effect when `contained={false}`.
   */
  containerClassName?: string;
}

const PADDING_MAP: Record<SectionPadding, string> = {
  none: "",
  sm: "py-10 md:py-14",
  md: "py-16 md:py-24",
  lg: "py-20 md:py-28",
};

/**
 * Single source of truth for public-page section width, padding, and tone.
 *
 * Always renders `relative` so callers can absolutely position decorative
 * children. Defaults to `overflow-hidden` to contain atmosphere/glow layers.
 */
export function Section({
  tone = "default",
  padding = "md",
  contained = true,
  overflow = "hidden",
  className,
  containerClassName,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn(
        "relative",
        overflow === "hidden" && "overflow-hidden",
        PADDING_MAP[padding],
        tone === "default" && "bg-background",
        tone === "muted" && "bg-card",
        tone === "dark" &&
          "bg-gradient-to-br from-night-900 via-night-800 to-night-900 text-white",
        className
      )}
      {...rest}
    >
      {contained ? (
        <div
          className={cn(
            "relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
            containerClassName
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
