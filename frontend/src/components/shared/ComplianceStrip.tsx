import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ComplianceStripProps {
  /** Override the title text — defaults to `compliance.title` translation. */
  title?: string;
  /** Override the body text — defaults to `compliance.text` translation. */
  text?: string;
  /** Tone — `default` reads on light bg, `dark` reads on night-900 panels. */
  tone?: "default" | "dark";
  className?: string;
}

/**
 * Reusable medical-disclaimer strip.
 * Centralizes wording + visual style so disclaimers are consistent across
 * About, Plans, Articles and any future page that surfaces medical content.
 */
export function ComplianceStrip({
  title,
  text,
  tone = "default",
  className,
}: ComplianceStripProps) {
  const t = useTranslations("compliance");
  const heading = title ?? t("title");
  const body = text ?? t("text");

  return (
    <aside
      role="note"
      aria-label={heading}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 sm:p-5",
        tone === "dark"
          ? "border-warm-peach/30 bg-white/5 text-night-100/85"
          : "border-warm-peach/30 bg-warm-peach/10 text-foreground",
        className
      )}
    >
      <ShieldAlert
        className={cn(
          "mt-0.5 h-5 w-5 flex-shrink-0",
          tone === "dark" ? "text-warm-peach" : "text-warm-rose"
        )}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{heading}</p>
        <p
          className={cn(
            "text-sm leading-relaxed",
            tone === "dark" ? "text-night-100/75" : "text-muted-foreground"
          )}
        >
          {body}
        </p>
      </div>
    </aside>
  );
}
