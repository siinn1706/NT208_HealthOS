import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Small uppercase eyebrow above the title (alias for `badge`). */
  eyebrow?: string;
  /** Pill badge above the title. Backwards-compatible with older callsites. */
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** `dark` tone reads against night-900 backgrounds. Backwards-compat with `dark` boolean. */
  tone?: "light" | "dark";
  dark?: boolean;
  /** Forwarded to the inner `<h2>` so `aria-labelledby` on a parent Section can target the actual heading. */
  id?: string;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  badge,
  title,
  subtitle,
  align = "center",
  tone,
  dark = false,
  id,
  className,
}: SectionHeaderProps) {
  const isDark = tone === "dark" || dark;
  const eyebrowText = eyebrow ?? badge;

  return (
    <div
      className={cn(
        "mb-10",
        align === "center" && "text-center",
        className
      )}
    >
      {eyebrowText && (
        <span
          className={cn(
            "mb-3 inline-block rounded-full px-3 py-1 text-sm font-semibold border-0",
            isDark
              ? "bg-gradient-to-r from-night-400/20 to-night-300/20 text-night-300"
              : "bg-gradient-to-r from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300"
          )}
        >
          {eyebrowText}
        </span>
      )}
      <h2
        id={id}
        className={cn(
          "text-3xl font-bold tracking-tight md:text-4xl lg:text-[40px]",
          isDark ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 max-w-2xl text-base",
            align === "center" && "mx-auto",
            isDark ? "text-night-100/70" : "text-muted-foreground"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
