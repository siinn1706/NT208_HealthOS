import { cn } from "@/lib/utils";

type SectionTone = "default" | "muted" | "dark" | "transparent";
type SectionPadding = "none" | "sm" | "md" | "lg";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual background tone for the section. */
  tone?: SectionTone;
  /** Vertical padding step. */
  padding?: SectionPadding;
  /** Constrain inner content with `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`. */
  contained?: boolean;
  /** Render as `<div>` instead of `<section>`. */
  asDiv?: boolean;
  /**
   * Defaults to `"hidden"` so atmosphere primitives can clip safely; set to
   * `"visible"` for sections without atmosphere so focus rings on inner CTAs
   * aren't clipped.
   */
  overflow?: "hidden" | "visible";
  children: React.ReactNode;
}

const toneClass: Record<SectionTone, string> = {
  default: "bg-background",
  muted:
    "bg-gradient-to-b from-background via-night-100/10 to-background dark:from-background dark:via-night-900/40 dark:to-background",
  dark: "bg-gradient-to-br from-night-900 via-night-800 to-night-900 text-white",
  transparent: "",
};

const paddingClass: Record<SectionPadding, string> = {
  none: "",
  sm: "py-12 md:py-16",
  md: "py-16 md:py-20",
  lg: "py-20 md:py-28",
};

/**
 * Shared marketing-page section shell.
 *
 * Centralizes vertical rhythm + tone so home/about/services/plans/articles
 * share identical spacing without each page reinventing classnames.
 *
 * - `tone`: switches background palette (default/muted/dark/transparent)
 * - `padding`: vertical rhythm step
 * - `contained`: wraps children in the standard 7xl content container
 *
 * Atmosphere primitives (AtmosphereGrid/Glow) and Decorations should be
 * placed as direct children when needed; this component reserves
 * `relative overflow-hidden` so they can absolute-position freely.
 */
export function Section({
  tone = "default",
  padding = "md",
  contained = true,
  asDiv = false,
  overflow = "hidden",
  className,
  children,
  ...rest
}: SectionProps) {
  const Tag = asDiv ? "div" : "section";
  return (
    <Tag
      className={cn(
        "relative",
        overflow === "hidden" ? "overflow-hidden" : "overflow-visible",
        toneClass[tone],
        paddingClass[padding],
        className
      )}
      {...rest}
    >
      {contained ? (
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  );
}
