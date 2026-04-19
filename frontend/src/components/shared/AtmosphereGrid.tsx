import { cn } from "@/lib/utils";

interface AtmosphereGridProps {
  className?: string;
}

/**
 * Subtle 1px grid backdrop for dark hero sections.
 * Two stacked linear-gradients form a 48px grid; a radial mask fades
 * the edges so only the middle third reads as "blueprint" texture.
 *
 * Design contract: opacity ≤ 4%, hidden below `sm` to keep mobile
 * perceived perf high. Pure CSS, no JS, no SVG, no new deps.
 */
export function AtmosphereGrid({ className }: AtmosphereGridProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 hidden sm:block",
        "[mask-image:radial-gradient(ellipse_at_50%_30%,black_0%,transparent_70%)]",
        "[-webkit-mask-image:radial-gradient(ellipse_at_50%_30%,black_0%,transparent_70%)]",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  );
}
