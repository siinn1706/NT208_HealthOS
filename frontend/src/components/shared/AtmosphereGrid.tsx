import { cn } from "@/lib/utils";

interface AtmosphereGridProps {
  className?: string;
}

/**
 * Subtle 1px line grid layered behind hero content.
 * - 48px cell size, white at ~4% opacity
 * - Radial mask fades grid toward edges so it dissolves behind copy
 * - Hidden below `sm` to keep mobile perf high
 * - Decorative only (aria-hidden, pointer-events-none)
 *
 * Designed to be the first child of a `relative overflow-hidden` hero `<section>`.
 */
export function AtmosphereGrid({ className }: AtmosphereGridProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 hidden sm:block",
        // Light mode: dark grid lines (visible on white/light surfaces)
        "[background-image:linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)]",
        // Dark mode: white grid lines (visible on dark surfaces)
        "dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]",
        "[background-size:48px_48px]",
        "[mask-image:radial-gradient(ellipse_at_50%_30%,black_0%,transparent_70%)]",
        "[-webkit-mask-image:radial-gradient(ellipse_at_50%_30%,black_0%,transparent_70%)]",
        className
      )}
    />
  );
}
