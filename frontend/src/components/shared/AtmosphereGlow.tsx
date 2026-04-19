import { cn } from "@/lib/utils";

interface AtmosphereGlowProps {
  /** When "glow-only" the inner cool bloom is omitted for use on inner page heroes. */
  variant?: "full" | "soft";
  className?: string;
}

/**
 * Dual radial-bloom backdrop for premium dark heroes.
 * - Warm bloom anchored top-right (matches the headline column)
 * - Cool bloom anchored bottom-left (matches the floating "92" badge column)
 * - Ambient drift via @keyframes glow-drift in globals.css
 * - motion-safe: drift halts under prefers-reduced-motion
 *
 * Aria-hidden, pointer-events-none. Bloom opacity ≤ 18%.
 */
export function AtmosphereGlow({ variant = "full", className }: AtmosphereGlowProps) {
  const warm =
    "radial-gradient(ellipse 600px 400px at 80% 20%, rgba(227, 183, 154, 0.18), transparent 60%)";
  const cool =
    "radial-gradient(ellipse 700px 500px at 15% 80%, rgba(65, 188, 230, 0.16), transparent 60%)";

  const layers = variant === "soft" ? warm : `${warm}, ${cool}`;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 motion-safe:sm:animate-glow-drift",
        className
      )}
      style={{ backgroundImage: layers }}
    />
  );
}
