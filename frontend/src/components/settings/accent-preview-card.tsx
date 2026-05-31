"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { deriveAccentTokens } from "@/lib/accent-utils";

interface AccentPreviewCardProps {
  /**
   * When provided, the preview card renders with CSS variables scoped to this
   * element only — the rest of the app is completely unaffected. Used to show
   * pending (unsaved) pick colors without leaking into the global theme.
   */
  accentHex?: string;
}

export function AccentPreviewCard({ accentHex }: AccentPreviewCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Derive tokens scoped to this div only. No document.documentElement writes.
  const scopedVars = useMemo(() => {
    if (!accentHex) return {} as React.CSSProperties;
    return deriveAccentTokens(accentHex, isDark) as unknown as React.CSSProperties;
  }, [accentHex, isDark]);

  return (
    <div style={scopedVars} className="rounded-lg border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
          Button
        </button>
        <button type="button"
          className="relative w-9 h-5 rounded-full bg-primary cursor-default"
          aria-label="toggle preview"
          tabIndex={-1}
        >
          <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white shadow" />
        </button>
        <span className="text-xs text-foreground underline cursor-default">Link</span>
        <div className="h-6 w-16 rounded border border-border bg-transparent ring-1 ring-primary/40" />
      </div>
    </div>
  );
}

export default AccentPreviewCard;
