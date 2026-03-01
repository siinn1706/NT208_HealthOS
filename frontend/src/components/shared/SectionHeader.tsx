import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
}

export function SectionHeader({
  badge,
  title,
  subtitle,
  align = "center",
  dark = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-10",
        align === "center" && "text-center",
        className
      )}
    >
      {badge && (
        <span
          className={cn(
            "mb-3 inline-block rounded-full px-3 py-1 text-sm font-semibold border-0",
            dark
              ? "bg-gradient-to-r from-night-400/20 to-night-300/20 text-night-300"
              : "bg-gradient-to-r from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300"
          )}
        >
          {badge}
        </span>
      )}
      <h2
        className={cn(
          "text-3xl font-bold tracking-tight md:text-4xl lg:text-[40px]",
          dark ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 max-w-2xl text-base",
            align === "center" && "mx-auto",
            dark ? "text-night-100/70" : "text-muted-foreground"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
