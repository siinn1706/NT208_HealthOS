import { cn } from "@/lib/utils";

interface DecorationProps {
  className?: string;
}

/**
 * Decorative angled ribbon shapes for section edges.
 * Wrap the target section in `relative overflow-hidden` and place these
 * components as direct children (before the content container).
 */

export function LeftDecoration({ className }: DecorationProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-0 top-0 -z-10 select-none",
        className
      )}
    >
      {/* lighter, wider backing ribbon */}
      <div className="h-72 w-16 origin-top-left -translate-x-4 -skew-y-6 rounded-r-xl bg-gradient-to-b from-night-400/20 via-night-500/15 to-night-600/20" />
      {/* solid foreground ribbon, offset inward */}
      <div className="absolute top-4 left-2 h-72 w-10 origin-top-left -translate-x-4 -skew-y-6 rounded-r-xl bg-gradient-to-b from-night-600 via-night-500 to-night-700 shadow-lg shadow-night-600/30" />
    </div>
  );
}

export function RightDecoration({ className }: DecorationProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute right-0 top-0 -z-10 select-none",
        className
      )}
    >
      {/* lighter, wider backing ribbon */}
      <div className="h-72 w-16 origin-top-right translate-x-4 skew-y-6 rounded-l-xl bg-gradient-to-b from-night-400/20 via-night-500/15 to-night-600/20" />
      {/* solid foreground ribbon, offset inward */}
      <div className="absolute top-4 right-2 h-72 w-10 origin-top-right translate-x-4 skew-y-6 rounded-l-xl bg-gradient-to-b from-night-600 via-night-500 to-night-700 shadow-lg shadow-night-600/30" />
    </div>
  );
}
